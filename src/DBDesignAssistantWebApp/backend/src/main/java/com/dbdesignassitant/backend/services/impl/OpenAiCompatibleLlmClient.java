package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.LlmClient;

import java.util.List;

public abstract class OpenAiCompatibleLlmClient implements LlmClient {
    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context) {
        throw new IllegalStateException(provider() + " provider is not implemented yet");
    }
}
