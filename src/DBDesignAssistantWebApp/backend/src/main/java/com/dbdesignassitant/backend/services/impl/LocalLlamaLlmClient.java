package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.LlmClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LocalLlamaLlmClient implements LlmClient {
    @Override
    public AiProvider provider() {
        return AiProvider.LOCAL_LLAMA;
    }

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public String model() {
        return "llama-cpp-placeholder";
    }

    @Override
    public LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context) {
        throw new IllegalStateException("LOCAL_LLAMA provider is not implemented yet");
    }
}
