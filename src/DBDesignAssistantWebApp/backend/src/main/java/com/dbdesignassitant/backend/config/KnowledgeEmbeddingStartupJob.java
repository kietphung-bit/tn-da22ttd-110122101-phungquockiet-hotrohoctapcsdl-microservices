package com.dbdesignassitant.backend.config;

import com.dbdesignassitant.backend.services.KnowledgeEmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE)
public class KnowledgeEmbeddingStartupJob implements ApplicationRunner {
    private final AiProperties aiProperties;
    private final KnowledgeEmbeddingService knowledgeEmbeddingService;

    @Override
    public void run(ApplicationArguments args) {
        if (!aiProperties.getEmbedding().isGenerateOnStartup()) {
            return;
        }
        log.info("Generating KnowledgeBase embeddings on startup for active APPROVED rows");
        knowledgeEmbeddingService.generateApprovedEmbeddings(false);
    }
}
