package com.dbdesignassitant.backend.repositories;

public interface KnowledgeSearchProjection {
    Long getKbId();

    String getKbTitle();

    String getKbContent();

    String getKbSource();

    String getKbCategory();

    String getApprovalStatus();

    String getKnowledgeScope();

    String getCreatedByName();

    Double getRelevanceScore();
}
