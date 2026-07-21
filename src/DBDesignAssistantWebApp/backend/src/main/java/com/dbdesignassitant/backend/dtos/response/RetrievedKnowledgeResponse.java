package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RetrievalMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetrievedKnowledgeResponse {
    private Long kbId;
    private String kbTitle;
    private String kbCategory;
    private String kbSource;
    private String snippet;
    private Integer rank;
    private RetrievalMode retrievalMode;
    private Double relevanceScore;
    private String relevanceLabel;
    private KnowledgeScope knowledgeScope;
    private KnowledgeApprovalStatus approvalStatus;
    private String contributorDisplayName;
}
