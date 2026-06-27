package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.EmbeddingClient;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiEmbeddingClient implements EmbeddingClient {
    private static final String DEFAULT_MODEL = "text-embedding-004";
    private static final int DEFAULT_DIMENSION = 768;

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
        String configured = cleanConfigValue(aiProperties.getEmbedding().getModel());
        if (StringUtils.hasText(configured) && !"mock-hashing-embedding".equals(configured)) {
            return configured;
        }
        return DEFAULT_MODEL;
    }

    @Override
    public int dimension() {
        return DEFAULT_DIMENSION;
    }

    @Override
    public List<Double> embed(String text) {
        if (!isAvailable()) {
            throw new IllegalStateException("Gemini embedding provider is not configured");
        }

        try {
            String encodedModel = URLEncoder.encode(model(), StandardCharsets.UTF_8);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + encodedModel
                    + ":embedContent?key="
                    + URLEncoder.encode(apiKey(), StandardCharsets.UTF_8);

            Map<String, Object> payload = Map.of(
                    "model", "models/" + model(),
                    "content", Map.of(
                            "parts", List.of(Map.of("text", text == null ? "" : text))
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Gemini embedding request failed with status {} for model {}",
                        response.statusCode(),
                        model());
                throw new IllegalStateException("Gemini embedding request failed with status "
                        + response.statusCode());
            }

            JsonNode values = objectMapper.readTree(response.body())
                    .path("embedding")
                    .path("values");
            if (!values.isArray() || values.isEmpty()) {
                throw new IllegalStateException("Gemini returned an empty embedding");
            }

            List<Double> embedding = new ArrayList<>(values.size());
            for (JsonNode value : values) {
                embedding.add(value.asDouble());
            }
            return embedding;
        } catch (Exception ex) {
            throw new IllegalStateException("Gemini embedding provider failed", ex);
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
