package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseResponse {
    private Long kbId;
    private String kbTitle;
    private String kbContent;
    private String kbSource;
    private String kbCategory;
    private String kbVector;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long createdById;
    private String createdByName;
    private KnowledgeApprovalStatus approvalStatus;
    private KnowledgeScope knowledgeScope;
    private Long reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String reviewNote;
}
