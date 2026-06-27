package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.request.ChatRequest;
import com.dbdesignassitant.backend.dtos.response.ChatConversationDetailResponse;
import com.dbdesignassitant.backend.dtos.response.ChatConversationSummaryResponse;
import com.dbdesignassitant.backend.dtos.response.ChatMessageResponse;
import com.dbdesignassitant.backend.dtos.response.ChatResponse;
import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;
import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.entities.ChatConversation;
import com.dbdesignassitant.backend.entities.ChatMessage;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.ChatMessageRole;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.ChatConversationRepository;
import com.dbdesignassitant.backend.repositories.ChatMessageRepository;
import com.dbdesignassitant.backend.services.ChatHistorySummarizer;
import com.dbdesignassitant.backend.services.ChatRateLimiter;
import com.dbdesignassitant.backend.services.ChatbotService;
import com.dbdesignassitant.backend.services.KnowledgeRetrievalService;
import com.dbdesignassitant.backend.services.LlmClient;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotServiceImpl implements ChatbotService {
    private final AiProperties aiProperties;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final List<LlmClient> llmClients;
    private final CurrentUserProvider currentUserProvider;
    private final ChatRateLimiter chatRateLimiter;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatHistorySummarizer chatHistorySummarizer;

    @Override
    @Transactional
    public ChatResponse ask(ChatRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        chatRateLimiter.checkAllowed(currentUser.getUserId());

        ChatConversation conversation = resolveConversation(request, currentUser);
        List<ChatMessage> promptHistory = chatHistorySummarizer.selectPromptMessages(conversation);

        chatMessageRepository.save(ChatMessage.builder()
                .conversation(conversation)
                .role(ChatMessageRole.USER)
                .content(request.getMessage())
                .build());

        int topK = Math.max(1, aiProperties.getRag().getTopK());
        KnowledgeRetrievalResult retrievalResult = knowledgeRetrievalService.retrieveTopK(request.getMessage(), topK);
        List<RetrievedKnowledgeResponse> sources = retrievalResult.getSources();
        String prompt = buildPrompt(request.getMessage(), promptHistory, sources);

        LlmClient client = resolveClient();
        LlmResponse llmResponse;
        try {
            llmResponse = client.generate(prompt, sources);
        } catch (RuntimeException ex) {
            log.warn("AI provider {} failed for chatbot RAG. Falling back to MOCK. Error: {}",
                    client.provider(),
                    ex.getMessage());
            LlmClient mockClient = requireMockClient();
            llmResponse = mockClient.generate(prompt, sources);
        }

        chatMessageRepository.save(ChatMessage.builder()
                .conversation(conversation)
                .role(ChatMessageRole.ASSISTANT)
                .content(llmResponse.getAnswer())
                .provider(llmResponse.getProvider() == null ? null : llmResponse.getProvider().name())
                .model(llmResponse.getModel())
                .retrievalMode(retrievalResult.getRetrievalMode() == null
                        ? null
                        : retrievalResult.getRetrievalMode().name())
                .build());
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        chatConversationRepository.save(conversation);

        return ChatResponse.builder()
                .answer(llmResponse.getAnswer())
                .sources(sources)
                .provider(llmResponse.getProvider())
                .model(llmResponse.getModel())
                .conversationId(conversation.getConversationId())
                .retrievalMode(retrievalResult.getRetrievalMode())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatConversationSummaryResponse> listConversations() {
        User currentUser = currentUserProvider.getCurrentUser();
        return chatConversationRepository.findByUser_UserIdOrderByUpdatedAtDescCreatedAtDesc(currentUser.getUserId())
                .stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ChatConversationDetailResponse getConversation(String conversationId) {
        User currentUser = currentUserProvider.getCurrentUser();
        ChatConversation conversation = chatConversationRepository
                .findByConversationIdAndUser_UserId(conversationId, currentUser.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        List<ChatMessageResponse> messages = chatMessageRepository
                .findByConversationOrderByCreatedAtAscMessageIdAsc(conversation)
                .stream()
                .map(this::toMessageResponse)
                .toList();

        return ChatConversationDetailResponse.builder()
                .conversationId(conversation.getConversationId())
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .messages(messages)
                .build();
    }

    private ChatConversation resolveConversation(ChatRequest request, User currentUser) {
        if (StringUtils.hasText(request.getConversationId())) {
            return chatConversationRepository
                    .findByConversationIdAndUser_UserId(request.getConversationId(), currentUser.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        }

        return chatConversationRepository.save(ChatConversation.builder()
                .user(currentUser)
                .title(buildConversationTitle(request.getMessage()))
                .build());
    }

    private String buildConversationTitle(String message) {
        if (!StringUtils.hasText(message)) {
            return "New chat";
        }
        String trimmed = message.trim();
        return trimmed.length() <= 60 ? trimmed : trimmed.substring(0, 60);
    }

    private LlmClient resolveClient() {
        Map<AiProvider, LlmClient> clients = clientByProvider();
        LlmClient mockClient = requireMockClient(clients);
        LlmClient configuredClient = clients.getOrDefault(aiProperties.getProvider(), mockClient);
        if (configuredClient != null && configuredClient.isAvailable()) {
            return configuredClient;
        }
        if (configuredClient != null && configuredClient.provider() != AiProvider.MOCK) {
            log.warn("AI provider {} is not available for chatbot RAG. Falling back to MOCK.",
                    configuredClient.provider());
        }
        return mockClient;
    }

    private Map<AiProvider, LlmClient> clientByProvider() {
        return llmClients.stream()
                .collect(Collectors.toMap(LlmClient::provider, Function.identity(), (first, second) -> first));
    }

    private LlmClient requireMockClient() {
        return requireMockClient(clientByProvider());
    }

    private LlmClient requireMockClient(Map<AiProvider, LlmClient> clients) {
        LlmClient mockClient = clients.get(AiProvider.MOCK);
        if (mockClient == null) {
            throw new IllegalStateException("MOCK AI provider is not registered");
        }
        return mockClient;
    }

    private String buildPrompt(String question, List<ChatMessage> recentHistory, List<RetrievedKnowledgeResponse> sources) {
        StringBuilder builder = new StringBuilder();
        builder.append("Ban la tro giang co so du lieu cho sinh vien.\n");
        builder.append("Chi tra loi dua tren CONTEXT duoc cung cap. Neu CONTEXT khong phu hop, noi ro chua tim thay tai lieu lien quan.\n");
        builder.append("Khong giai ho toan bo bai tap thiet ke CSDL/ERD; chi dua goi y ngan gon, de hieu, theo tung buoc khi can.\n\n");
        builder.append("CHAT_HISTORY_GAN_DAY:\n");
        if (recentHistory.isEmpty()) {
            builder.append("(Chua co lich su hoi thoai truoc do.)\n\n");
        } else {
            for (ChatMessage message : recentHistory) {
                builder.append(message.getRole() == ChatMessageRole.USER ? "Sinh vien: " : "Tro giang: ")
                        .append(limitHistoryContent(message.getContent()))
                        .append("\n");
            }
            builder.append("\n");
        }
        builder.append("CONTEXT:\n");
        if (sources.isEmpty()) {
            builder.append("(Khong co tai lieu phu hop trong KnowledgeBase da duyet.)\n");
        } else {
            for (int i = 0; i < sources.size(); i++) {
                RetrievedKnowledgeResponse source = sources.get(i);
                builder.append(i + 1)
                        .append(". Title: ").append(nullToEmpty(source.getKbTitle()))
                        .append("\nCategory: ").append(nullToEmpty(source.getKbCategory()))
                        .append("\nSource: ").append(nullToEmpty(source.getKbSource()))
                        .append("\nSnippet: ").append(nullToEmpty(source.getSnippet()))
                        .append("\n\n");
            }
        }
        builder.append("QUESTION:\n").append(question).append("\n\n");
        builder.append("ANSWER:");
        return builder.toString();
    }

    private String limitHistoryContent(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 800 ? normalized : normalized.substring(0, 800) + "...";
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private ChatConversationSummaryResponse toSummaryResponse(ChatConversation conversation) {
        String preview = chatMessageRepository.findByConversationOrderByCreatedAtDescMessageIdDesc(
                        conversation,
                        org.springframework.data.domain.PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(ChatMessage::getContent)
                .map(this::buildPreview)
                .orElse("");

        return ChatConversationSummaryResponse.builder()
                .conversationId(conversation.getConversationId())
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .lastMessagePreview(preview)
                .build();
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .messageId(message.getMessageId())
                .role(message.getRole())
                .content(message.getContent())
                .provider(message.getProvider())
                .model(message.getModel())
                .retrievalMode(message.getRetrievalMode())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String buildPreview(String content) {
        if (!StringUtils.hasText(content)) {
            return "";
        }
        String normalized = content.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 90 ? normalized : normalized.substring(0, 90) + "...";
    }
}
