package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class DeepSeekLlmClientTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void missingKeyMakesProviderUnavailable() {
        AiProperties properties = new AiProperties();
        DeepSeekLlmClient client = new DeepSeekLlmClient(properties, objectMapper);

        assertFalse(client.isAvailable());
    }

    @Test
    void generateCallsOpenAiCompatibleChatCompletionsEndpoint() throws Exception {
        AtomicReference<String> authorizationHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = startServer(authorizationHeader, requestBody);

        AiProperties properties = new AiProperties();
        properties.getDeepseek().setApiKey("'test-key'");
        properties.getDeepseek().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/");
        properties.getDeepseek().setModel("deepseek-v4-flash");
        properties.getDeepseek().setTimeoutSeconds(5);
        DeepSeekLlmClient client = new DeepSeekLlmClient(properties, objectMapper);

        LlmResponse response = client.generate(
                "Tra ve dung mot JSON object cho bai tap thiet ke CSDL.",
                List.of());

        assertEquals(AiProvider.DEEPSEEK, response.getProvider());
        assertEquals("deepseek-v4-flash", response.getModel());
        assertEquals("{\"title\":\"Generated exercise\"}", response.getAnswer());
        assertEquals("Bearer test-key", authorizationHeader.get());

        JsonNode payload = objectMapper.readTree(requestBody.get());
        assertEquals("deepseek-v4-flash", payload.path("model").asText());
        assertEquals("Tra ve dung mot JSON object cho bai tap thiet ke CSDL.",
                payload.path("messages").path(0).path("content").asText());
        assertEquals("json_object", payload.path("response_format").path("type").asText());
    }

    private HttpServer startServer(
            AtomicReference<String> authorizationHeader,
            AtomicReference<String> requestBody) throws IOException {
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/chat/completions", exchange -> {
            authorizationHeader.set(exchange.getRequestHeaders().getFirst("Authorization"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = """
                    {
                      "choices": [
                        {
                          "message": {
                            "content": "{\\"title\\":\\"Generated exercise\\"}"
                          }
                        }
                      ]
                    }
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        httpServer.start();
        return httpServer;
    }
}
