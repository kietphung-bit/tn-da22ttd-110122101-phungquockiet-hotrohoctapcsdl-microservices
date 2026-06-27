package com.dbdesignassitant.backend.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_base")
public class KnowledgeBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "kb_id")
    private Long kbId;

    @Column(name = "kb_title", nullable = false)
    private String kbTitle;

    @Column(name = "kb_content", nullable = false, columnDefinition = "TEXT")
    private String kbContent;

    @Column(name = "kb_source")
    private String kbSource;

    @Column(name = "kb_category")
    private String kbCategory;

    @Column(name = "kb_vector", columnDefinition = "vector(384)", insertable = false, updatable = false)
    private String kbVector;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, columnDefinition = "varchar(30)")
    @Builder.Default
    private KnowledgeApprovalStatus approvalStatus = KnowledgeApprovalStatus.APPROVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "knowledge_scope", nullable = false, columnDefinition = "varchar(30)")
    @Builder.Default
    private KnowledgeScope knowledgeScope = KnowledgeScope.SYSTEM;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
