package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.AiProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmbeddingBatchResponse {
    private int eligibleCount;
    private int generatedCount;
    private int skippedCount;
    private AiProvider provider;
    private String model;
    private int dimension;
    private boolean pgvectorReady;
}
