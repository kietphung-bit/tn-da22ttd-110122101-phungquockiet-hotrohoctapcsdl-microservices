package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;

import java.util.List;

public interface LlmClient {
    AiProvider provider();

    boolean isAvailable();

    String model();

    LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context);
}
