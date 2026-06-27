package com.dbdesignassitant.backend.config;

import com.dbdesignassitant.backend.enums.AiProvider;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {
    private AiProvider provider = AiProvider.MOCK;
    private Rag rag = new Rag();
    private Chat chat = new Chat();
    private Embedding embedding = new Embedding();
    private ModelConfig gemini = new ModelConfig();
    private ModelConfig openai = new ModelConfig();
    private ModelConfig deepseek = new ModelConfig();

    @Data
    public static class Rag {
        private int topK = 3;
    }

    @Data
    public static class Chat {
        private int rateLimitPerMinute = 10;
        private int historyWindowMessages = 8;
    }

    @Data
    public static class Embedding {
        private AiProvider provider = AiProvider.MOCK;
        private String model = "mock-hashing-embedding";
        private int dimension = 384;
        private boolean pgvectorEnabled = true;
        private boolean vectorRetrievalEnabled = true;
        private boolean vectorIndexEnabled = true;
        private boolean generateOnStartup = false;
    }

    @Data
    public static class ModelConfig {
        private String apiKey;
        private String model;
    }
}
