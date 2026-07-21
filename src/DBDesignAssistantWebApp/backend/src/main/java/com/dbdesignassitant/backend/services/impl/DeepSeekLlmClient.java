package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DeepSeekLlmClient extends OpenAiCompatibleLlmClient {
    private static final String DEFAULT_BASE_URL = "https://api.deepseek.com";
    private static final String DEFAULT_MODEL = "deepseek-v4-flash";
    private static final int DEFAULT_TIMEOUT_SECONDS = 30;
    private static final int MAX_TIMEOUT_SECONDS = 120;

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public AiProvider provider() {
        return AiProvider.DEEPSEEK;
    }

    @Override
    public boolean isAvailable() {
        return StringUtils.hasText(apiKey());
    }

    @Override
    public String model() {
        String configuredModel = cleanConfigValue(aiProperties.getDeepseek().getModel());
        return StringUtils.hasText(configuredModel)
                ? configuredModel
                : DEFAULT_MODEL;
    }

    @Override
    public LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context) {
        if (!isAvailable()) {
            throw new IllegalStateException("DeepSeek provider is not configured");
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model());
            payload.put("messages", List.of(Map.of(
                    "role", "user",
                    "content", prompt
            )));
            payload.put("stream", false);
            payload.put("temperature", 0.2);
            payload.put("max_tokens", 2000);
            if (expectsJsonObject(prompt)) {
                payload.put("response_format", Map.of("type", "json_object"));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chatCompletionsUrl()))
                    .timeout(Duration.ofSeconds(timeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("DeepSeek request failed with status {} for model {}", response.statusCode(), model());
                throw new IllegalStateException("DeepSeek request failed with status " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String answer = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();

            if (!StringUtils.hasText(answer)) {
                throw new IllegalStateException("DeepSeek returned an empty answer");
            }

            return LlmResponse.builder()
                    .answer(answer.trim())
                    .provider(provider())
                    .model(model())
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("DeepSeek provider failed", ex);
        }
    }

    private String chatCompletionsUrl() {
        return baseUrl().replaceAll("/+$", "") + "/chat/completions";
    }

    private String baseUrl() {
        String configuredBaseUrl = cleanConfigValue(aiProperties.getDeepseek().getBaseUrl());
        return StringUtils.hasText(configuredBaseUrl)
                ? configuredBaseUrl
                : DEFAULT_BASE_URL;
    }

    private String apiKey() {
        return cleanConfigValue(aiProperties.getDeepseek().getApiKey());
    }

    private int timeoutSeconds() {
        int configuredTimeout = aiProperties.getDeepseek().getTimeoutSeconds();
        if (configuredTimeout <= 0) {
            return DEFAULT_TIMEOUT_SECONDS;
        }
        return Math.min(configuredTimeout, MAX_TIMEOUT_SECONDS);
    }

    private boolean expectsJsonObject(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = prompt.toLowerCase();
        return normalized.contains("json object")
                || normalized.contains("json bat buoc")
                || normalized.contains("json bắt buộc");
    }

    private String cleanConfigValue(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        if (cleaned.length() >= 2
                && ((cleaned.startsWith("\"") && cleaned.endsWith("\""))
                || (cleaned.startsWith("'") && cleaned.endsWith("'")))) {
            return cleaned.substring(1, cleaned.length() - 1).trim();
        }
        return cleaned;
    }
}
