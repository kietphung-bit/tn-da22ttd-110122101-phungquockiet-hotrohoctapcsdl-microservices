package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.RetrievalMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeRetrievalResult {
    private List<RetrievedKnowledgeResponse> sources;
    private RetrievalMode retrievalMode;
}
