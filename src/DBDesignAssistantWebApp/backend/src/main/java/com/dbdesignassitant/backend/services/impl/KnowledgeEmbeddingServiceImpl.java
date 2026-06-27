package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.EmbeddingBatchResponse;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.services.EmbeddingClient;
import com.dbdesignassitant.backend.services.KnowledgeEmbeddingService;
import com.dbdesignassitant.backend.services.PgVectorService;
import com.dbdesignassitant.backend.utils.EmbeddingVectorUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeEmbeddingServiceImpl implements KnowledgeEmbeddingService {
    private final AiProperties aiProperties;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final List<EmbeddingClient> embeddingClients;
    private final PgVectorService pgVectorService;

    @Override
    @Transactional
    public EmbeddingBatchResponse generateApprovedEmbeddings(boolean regenerate) {
        EmbeddingClient client = resolveClient();
        boolean vectorColumnReady = pgVectorService.isKnowledgeBaseVectorColumnReady();
        List<KnowledgeBase> targets = vectorColumnReady
                ? knowledgeBaseRepository.findEmbeddingTargetsWithVectorColumn(regenerate)
                : knowledgeBaseRepository.findEmbeddingTargets(KnowledgeApprovalStatus.APPROVED, regenerate);

        int generated = 0;
        int skipped = 0;
        for (KnowledgeBase knowledgeBase : targets) {
            String text = buildEmbeddingText(knowledgeBase);
            if (!StringUtils.hasText(text)) {
                skipped++;
                continue;
            }
            try {
                List<Double> embedding = client.embed(text);
                saveEmbedding(knowledgeBase, EmbeddingVectorUtils.toPgVectorLiteral(embedding), vectorColumnReady);
                generated++;
            } catch (RuntimeException ex) {
                skipped++;
                log.warn("Could not generate embedding for KnowledgeBase {} with provider {}. Error: {}",
                        knowledgeBase.getKbId(),
                        client.provider(),
                        ex.getMessage());
            }
        }

        return EmbeddingBatchResponse.builder()
                .eligibleCount(targets.size())
                .generatedCount(generated)
                .skippedCount(skipped)
                .provider(client.provider())
                .model(client.model())
                .dimension(client.dimension())
                .pgvectorReady(pgVectorService.isPgVectorReady())
                .build();
    }

    private void saveEmbedding(KnowledgeBase knowledgeBase, String vectorLiteral, boolean vectorColumnReady) {
        if (vectorColumnReady) {
            knowledgeBaseRepository.updateKbVectorColumn(knowledgeBase.getKbId(), vectorLiteral);
            knowledgeBase.setKbVector(vectorLiteral);
            return;
        }
        knowledgeBaseRepository.updateKbVectorText(knowledgeBase.getKbId(), vectorLiteral);
        knowledgeBase.setKbVector(vectorLiteral);
    }

    private EmbeddingClient resolveClient() {
        Map<AiProvider, EmbeddingClient> clients = embeddingClients.stream()
                .collect(Collectors.toMap(EmbeddingClient::provider, Function.identity(), (first, second) -> first));
        EmbeddingClient mockClient = clients.get(AiProvider.MOCK);
        if (mockClient == null) {
            throw new IllegalStateException("MOCK embedding provider is not registered");
        }
        EmbeddingClient configuredClient = clients.getOrDefault(aiProperties.getEmbedding().getProvider(), mockClient);
        if (configuredClient.isAvailable()) {
            return configuredClient;
        }
        if (configuredClient.provider() != AiProvider.MOCK) {
            log.warn("Embedding provider {} is not available. Falling back to MOCK.",
                    configuredClient.provider());
        }
        return mockClient;
    }

    private String buildEmbeddingText(KnowledgeBase knowledgeBase) {
        return String.join("\n",
                nullToEmpty(knowledgeBase.getKbTitle()),
                nullToEmpty(knowledgeBase.getKbCategory()),
                nullToEmpty(knowledgeBase.getKbSource()),
                nullToEmpty(knowledgeBase.getKbContent()));
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
