package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
    List<KnowledgeBase> findByIsActiveTrue();
    List<KnowledgeBase> findByCreatedBy_UserId(Long userId);
    List<KnowledgeBase> findByKnowledgeScopeAndApprovalStatus(KnowledgeScope scope, KnowledgeApprovalStatus status);
    List<KnowledgeBase> findByIsActiveTrueAndKnowledgeScopeAndApprovalStatus(
            KnowledgeScope scope,
            KnowledgeApprovalStatus status);
    List<KnowledgeBase> findByApprovalStatus(KnowledgeApprovalStatus status);
    List<KnowledgeBase> findByIsActiveTrueAndApprovalStatus(KnowledgeApprovalStatus status);

    @Query("""
            select kb from KnowledgeBase kb
            where kb.isActive = true
              and kb.approvalStatus = :status
              and (:regenerate = true or kb.kbVector is null or trim(kb.kbVector) = '')
            order by kb.kbId
            """)
    List<KnowledgeBase> findEmbeddingTargets(
            @Param("status") KnowledgeApprovalStatus status,
            @Param("regenerate") boolean regenerate);

    @Query(value = """
            select *
            from knowledge_base
            where is_active = true
              and approval_status = 'APPROVED'
              and (:regenerate = true or kb_vector is null)
            order by kb_id
            """, nativeQuery = true)
    List<KnowledgeBase> findEmbeddingTargetsWithVectorColumn(@Param("regenerate") boolean regenerate);

    @Query(value = """
            select *
            from knowledge_base
            where is_active = true
              and approval_status = 'APPROVED'
              and kb_vector is not null
            order by (kb_vector <=> cast(:queryVector as vector))
            limit :topK
            """, nativeQuery = true)
    List<KnowledgeBase> findTopKByVectorSimilarity(
            @Param("queryVector") String queryVector,
            @Param("topK") int topK);

    @Query(value = """
            select
              kb.kb_id as "kbId",
              kb.kb_title as "kbTitle",
              kb.kb_content as "kbContent",
              kb.kb_source as "kbSource",
              kb.kb_category as "kbCategory",
              kb.approval_status as "approvalStatus",
              kb.knowledge_scope as "knowledgeScope",
              u.full_name as "createdByName",
              (1 - (kb.kb_vector <=> cast(:queryVector as vector))) as "relevanceScore"
            from knowledge_base kb
            left join users u on u.user_id = kb.created_by
            where kb.is_active = true
              and kb.approval_status = 'APPROVED'
              and kb.kb_vector is not null
            order by (kb.kb_vector <=> cast(:queryVector as vector)), kb.kb_id
            limit :topK
            """, nativeQuery = true)
    List<KnowledgeSearchProjection> findTopKProjectedByVectorSimilarity(
            @Param("queryVector") String queryVector,
            @Param("topK") int topK);

    @Query(value = """
            select *
            from knowledge_base
            where is_active = true
              and approval_status = 'APPROVED'
              and kb_vector is not null
              and length(trim(kb_vector)) > 0
            order by (kb_vector::vector <=> cast(:queryVector as vector))
            limit :topK
            """, nativeQuery = true)
    List<KnowledgeBase> findTopKByTextVectorCastSimilarity(
            @Param("queryVector") String queryVector,
            @Param("topK") int topK);

    @Query(value = """
            select
              kb.kb_id as "kbId",
              kb.kb_title as "kbTitle",
              kb.kb_content as "kbContent",
              kb.kb_source as "kbSource",
              kb.kb_category as "kbCategory",
              kb.approval_status as "approvalStatus",
              kb.knowledge_scope as "knowledgeScope",
              u.full_name as "createdByName",
              (1 - (kb.kb_vector::vector <=> cast(:queryVector as vector))) as "relevanceScore"
            from knowledge_base kb
            left join users u on u.user_id = kb.created_by
            where kb.is_active = true
              and kb.approval_status = 'APPROVED'
              and kb.kb_vector is not null
              and length(trim(kb.kb_vector)) > 0
            order by (kb.kb_vector::vector <=> cast(:queryVector as vector)), kb.kb_id
            limit :topK
            """, nativeQuery = true)
    List<KnowledgeSearchProjection> findTopKProjectedByTextVectorCastSimilarity(
            @Param("queryVector") String queryVector,
            @Param("topK") int topK);

    @Modifying
    @Query(value = """
            update knowledge_base
            set kb_vector = cast(:vectorLiteral as vector(384))
            where kb_id = :kbId
            """, nativeQuery = true)
    int updateKbVectorColumn(
            @Param("kbId") Long kbId,
            @Param("vectorLiteral") String vectorLiteral);

    @Modifying
    @Query(value = """
            update knowledge_base
            set kb_vector = :vectorLiteral
            where kb_id = :kbId
            """, nativeQuery = true)
    int updateKbVectorText(
            @Param("kbId") Long kbId,
            @Param("vectorLiteral") String vectorLiteral);
}
