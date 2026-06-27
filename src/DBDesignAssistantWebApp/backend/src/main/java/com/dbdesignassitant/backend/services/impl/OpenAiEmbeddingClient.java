package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.EmbeddingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OpenAiEmbeddingClient implements EmbeddingClient {
    private final AiProperties aiProperties;

    @Override
    public AiProvider provider() {
        return AiProvider.OPENAI;
    }

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public String model() {
        return aiProperties.getOpenai().getModel();
    }

    @Override
    public int dimension() {
        return aiProperties.getEmbedding().getDimension();
    }

    @Override
    public List<Double> embed(String text) {
        throw new UnsupportedOperationException("OpenAI embedding client is a placeholder");
    }
}
