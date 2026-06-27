package com.dbdesignassitant.backend.services;

public interface PgVectorService {
    void ensurePgVectorExtension();

    boolean isPgVectorReady();

    boolean isKnowledgeBaseVectorColumnReady();
}
