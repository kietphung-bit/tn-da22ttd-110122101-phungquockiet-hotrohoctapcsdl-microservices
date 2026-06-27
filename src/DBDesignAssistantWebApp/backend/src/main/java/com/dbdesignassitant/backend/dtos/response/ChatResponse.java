package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.AiProvider;
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
public class ChatResponse {
    private String answer;
    private List<RetrievedKnowledgeResponse> sources;
    private AiProvider provider;
    private String model;
    private String conversationId;
    private RetrievalMode retrievalMode;
}
