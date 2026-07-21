package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {
    Optional<ChatConversation> findByConversationIdAndUser_UserId(String conversationId, Long userId);

    @Query("""
            SELECT c
            FROM ChatConversation c
            WHERE c.user.userId = :userId
              AND (
                  (:archived = true AND c.studentArchived = true)
                  OR (:archived = false AND (c.studentArchived = false OR c.studentArchived IS NULL))
              )
            ORDER BY c.updatedAt DESC, c.createdAt DESC
            """)
    List<ChatConversation> findByUserIdAndArchiveState(
            @Param("userId") Long userId,
            @Param("archived") boolean archived);
}
