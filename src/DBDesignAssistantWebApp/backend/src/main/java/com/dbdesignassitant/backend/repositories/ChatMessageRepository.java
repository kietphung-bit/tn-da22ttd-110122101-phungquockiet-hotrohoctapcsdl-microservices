package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.ChatConversation;
import com.dbdesignassitant.backend.entities.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationOrderByCreatedAtDescMessageIdDesc(
            ChatConversation conversation,
            Pageable pageable);

    List<ChatMessage> findByConversationOrderByCreatedAtAscMessageIdAsc(ChatConversation conversation);
}
