package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.LlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiLlmClient implements LlmClient {
    private static final String DEFAULT_MODEL = "gemini-2.0-flash";

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public AiProvider provider() {
        return AiProvider.GEMINI;
    }

    @Override
    public boolean isAvailable() {
        return StringUtils.hasText(apiKey());
    }

    @Override
    public String model() {
        String configuredModel = cleanConfigValue(aiProperties.getGemini().getModel());
        return StringUtils.hasText(configuredModel)
                ? configuredModel
                : DEFAULT_MODEL;
    }

    @Override
    public LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context) {
        if (!isAvailable()) {
            throw new IllegalStateException("Gemini provider is not configured");
        }

        try {
            String encodedModel = URLEncoder.encode(model(), StandardCharsets.UTF_8);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + encodedModel
                    + ":generateContent?key="
                    + URLEncoder.encode(apiKey(), StandardCharsets.UTF_8);

            Map<String, Object> payload = Map.of(
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", prompt))
                    ))
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Gemini request failed with status {} for model {}", response.statusCode(), model());
                throw new IllegalStateException("Gemini request failed with status " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String answer = root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText();

            if (!StringUtils.hasText(answer)) {
                throw new IllegalStateException("Gemini returned an empty answer");
            }

            return LlmResponse.builder()
                    .answer(answer.trim())
                    .provider(provider())
                    .model(model())
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("Gemini provider failed", ex);
        }
    }

    private String apiKey() {
        return cleanConfigValue(aiProperties.getGemini().getApiKey());
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
