package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {
    Optional<ChatConversation> findByConversationIdAndUser_UserId(String conversationId, Long userId);

    List<ChatConversation> findByUser_UserIdOrderByUpdatedAtDescCreatedAtDesc(Long userId);
}
