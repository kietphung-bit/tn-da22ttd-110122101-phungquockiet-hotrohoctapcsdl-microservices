package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.EmbeddingBatchResponse;

public interface KnowledgeEmbeddingService {
    EmbeddingBatchResponse generateApprovedEmbeddings(boolean regenerate);
}
