package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.enums.AiProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class DeepSeekLlmClient extends OpenAiCompatibleLlmClient {
    private final AiProperties aiProperties;

    @Override
    public AiProvider provider() {
        return AiProvider.DEEPSEEK;
    }

    @Override
    public String model() {
        return StringUtils.hasText(aiProperties.getDeepseek().getModel())
                ? aiProperties.getDeepseek().getModel()
                : "deepseek-placeholder";
    }
}
