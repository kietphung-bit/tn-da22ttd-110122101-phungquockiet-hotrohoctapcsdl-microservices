package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.ChatConversationSummaryResponse;
import com.dbdesignassitant.backend.entities.ChatConversation;
import com.dbdesignassitant.backend.entities.ChatMessage;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ChatMessageRole;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.ChatConversationRepository;
import com.dbdesignassitant.backend.repositories.ChatMessageRepository;
import com.dbdesignassitant.backend.services.ChatHistorySummarizer;
import com.dbdesignassitant.backend.services.ChatRateLimiter;
import com.dbdesignassitant.backend.services.KnowledgeRetrievalService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ChatbotServiceImplTest {

    @Mock
    private KnowledgeRetrievalService knowledgeRetrievalService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private ChatRateLimiter chatRateLimiter;

    @Mock
    private ChatConversationRepository chatConversationRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatHistorySummarizer chatHistorySummarizer;

    private AiProperties aiProperties;
    private ChatbotServiceImpl service;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        service = new ChatbotServiceImpl(
                aiProperties,
                knowledgeRetrievalService,
                List.of(),
                currentUserProvider,
                chatRateLimiter,
                chatConversationRepository,
                chatMessageRepository,
                chatHistorySummarizer);
    }

    @Test
    void listConversationsUsesArchiveStateAndMapsNullArchiveAsActive() {
        User student = student(1L);
        ChatConversation conversation = conversation("conv-1", student, null, null);
        ChatMessage latestMessage = ChatMessage.builder()
                .messageId(10L)
                .conversation(conversation)
                .role(ChatMessageRole.ASSISTANT)
                .content("ERD is an entity relationship diagram.")
                .createdAt(LocalDateTime.now())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(chatConversationRepository.findByUserIdAndArchiveState(student.getUserId(), false))
                .thenReturn(List.of(conversation));
        when(chatMessageRepository.findByConversationOrderByCreatedAtDescMessageIdDesc(
                eq(conversation),
                any(Pageable.class)))
                .thenReturn(List.of(latestMessage));

        List<ChatConversationSummaryResponse> responses = service.listConversations(false);

        assertEquals(1, responses.size());
        assertEquals("conv-1", responses.get(0).getConversationId());
        assertFalse(Boolean.TRUE.equals(responses.get(0).getStudentArchived()));
        assertEquals("ERD is an entity relationship diagram.", responses.get(0).getLastMessagePreview());
        verify(chatConversationRepository).findByUserIdAndArchiveState(student.getUserId(), false);
    }

    @Test
    void studentCanArchiveOwnConversationWithoutDeletingMessages() {
        User student = student(1L);
        ChatConversation conversation = conversation("conv-2", student, false, null);

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(chatConversationRepository.findByConversationIdAndUser_UserId("conv-2", student.getUserId()))
                .thenReturn(Optional.of(conversation));
        when(chatConversationRepository.save(any(ChatConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(chatMessageRepository.findByConversationOrderByCreatedAtDescMessageIdDesc(
                eq(conversation),
                any(Pageable.class)))
                .thenReturn(List.of());

        ChatConversationSummaryResponse response = service.setConversationArchived("conv-2", true);

        assertEquals("conv-2", response.getConversationId());
        assertEquals(true, response.getStudentArchived());
        assertNotNull(response.getStudentArchivedAt());
        assertEquals(true, conversation.getStudentArchived());
        assertNotNull(conversation.getStudentArchivedAt());
        verify(chatConversationRepository).save(conversation);
        verify(chatMessageRepository, never()).delete(any(ChatMessage.class));
    }

    @Test
    void studentCanRestoreOwnConversation() {
        User student = student(1L);
        ChatConversation conversation = conversation("conv-3", student, true, LocalDateTime.now());

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(chatConversationRepository.findByConversationIdAndUser_UserId("conv-3", student.getUserId()))
                .thenReturn(Optional.of(conversation));
        when(chatConversationRepository.save(any(ChatConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(chatMessageRepository.findByConversationOrderByCreatedAtDescMessageIdDesc(
                eq(conversation),
                any(Pageable.class)))
                .thenReturn(List.of());

        ChatConversationSummaryResponse response = service.setConversationArchived("conv-3", false);

        assertEquals(false, response.getStudentArchived());
        assertNull(response.getStudentArchivedAt());
        assertEquals(false, conversation.getStudentArchived());
        assertNull(conversation.getStudentArchivedAt());
    }

    @Test
    void studentCannotArchiveAnotherUsersConversation() {
        User student = student(1L);

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(chatConversationRepository.findByConversationIdAndUser_UserId("other-conv", student.getUserId()))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.setConversationArchived("other-conv", true));

        verify(chatConversationRepository, never()).save(any(ChatConversation.class));
    }

    private ChatConversation conversation(
            String conversationId,
            User user,
            Boolean studentArchived,
            LocalDateTime studentArchivedAt) {
        return ChatConversation.builder()
                .conversationId(conversationId)
                .user(user)
                .title("ERD")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .studentArchived(studentArchived)
                .studentArchivedAt(studentArchivedAt)
                .build();
    }

    private User student(Long id) {
        return User.builder()
                .userId(id)
                .userEmail("student-" + id + "@dbdesign.local")
                .fullName("Student " + id)
                .isActive(true)
                .build();
    }
}
