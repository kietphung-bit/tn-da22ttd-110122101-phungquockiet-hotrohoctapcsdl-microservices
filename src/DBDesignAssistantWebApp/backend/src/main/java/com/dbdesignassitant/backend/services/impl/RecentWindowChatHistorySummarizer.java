package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.entities.ChatConversation;
import com.dbdesignassitant.backend.entities.ChatMessage;
import com.dbdesignassitant.backend.repositories.ChatMessageRepository;
import com.dbdesignassitant.backend.services.ChatHistorySummarizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecentWindowChatHistorySummarizer implements ChatHistorySummarizer {
    private final AiProperties aiProperties;
    private final ChatMessageRepository chatMessageRepository;

    @Override
    public List<ChatMessage> selectPromptMessages(ChatConversation conversation) {
        int historyLimit = Math.max(0, aiProperties.getChat().getHistoryWindowMessages());
        if (historyLimit == 0) {
            return List.of();
        }

        // MVP: keep only the recent message window. TODO: add LLM-based summary when long chats need it.
        List<ChatMessage> newestFirst = chatMessageRepository.findByConversationOrderByCreatedAtDescMessageIdDesc(
                conversation,
                PageRequest.of(0, historyLimit));
        List<ChatMessage> chronological = new ArrayList<>(newestFirst);
        Collections.reverse(chronological);
        return chronological;
    }
}
