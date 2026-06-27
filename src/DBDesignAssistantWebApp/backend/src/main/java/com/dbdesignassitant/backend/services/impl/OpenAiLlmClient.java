package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.enums.AiProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class OpenAiLlmClient extends OpenAiCompatibleLlmClient {
    private final AiProperties aiProperties;

    @Override
    public AiProvider provider() {
        return AiProvider.OPENAI;
    }

    @Override
    public String model() {
        return StringUtils.hasText(aiProperties.getOpenai().getModel())
                ? aiProperties.getOpenai().getModel()
                : "openai-placeholder";
    }
}
