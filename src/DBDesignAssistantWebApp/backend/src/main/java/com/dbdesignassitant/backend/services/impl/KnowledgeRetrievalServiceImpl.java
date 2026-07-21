package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RetrievalMode;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.KnowledgeSearchProjection;
import com.dbdesignassitant.backend.services.EmbeddingClient;
import com.dbdesignassitant.backend.services.KnowledgeRetrievalService;
import com.dbdesignassitant.backend.services.PgVectorService;
import com.dbdesignassitant.backend.utils.EmbeddingVectorUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeRetrievalServiceImpl implements KnowledgeRetrievalService {
    private static final int SNIPPET_LENGTH = 420;
    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{Nd}]+");
    private static final Set<String> STOP_WORDS = Set.of(
            "la", "gi", "cua", "de", "cho", "va", "or", "and", "the", "a", "an",
            "dung", "nhu", "nao", "trong", "co", "khong"
    );

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final AiProperties aiProperties;
    private final List<EmbeddingClient> embeddingClients;
    private final PgVectorService pgVectorService;

    @Override
    public KnowledgeRetrievalResult retrieveTopK(String question, int topK) {
        if (!StringUtils.hasText(question) || topK <= 0) {
            return result(List.of(), RetrievalMode.KEYWORD_FALLBACK);
        }

        List<RetrievedKnowledgeResponse> vectorSources = retrieveVectorTopK(question, topK);
        if (!vectorSources.isEmpty()) {
            return result(vectorSources, RetrievalMode.VECTOR);
        }

        return result(retrieveKeywordTopK(question, topK), RetrievalMode.KEYWORD_FALLBACK);
    }

    private List<RetrievedKnowledgeResponse> retrieveVectorTopK(String question, int topK) {
        if (!aiProperties.getEmbedding().isVectorRetrievalEnabled() || !pgVectorService.isPgVectorReady()) {
            return List.of();
        }

        try {
            EmbeddingClient client = resolveEmbeddingClient();
            List<Double> embedding = client.embed(question);
            String vectorLiteral = EmbeddingVectorUtils.toPgVectorLiteral(embedding);
            List<String> terms = tokenize(question);
            List<KnowledgeSearchProjection> matches = pgVectorService.isKnowledgeBaseVectorColumnReady()
                    ? knowledgeBaseRepository.findTopKProjectedByVectorSimilarity(vectorLiteral, topK)
                    : knowledgeBaseRepository.findTopKProjectedByTextVectorCastSimilarity(vectorLiteral, topK);
            return mapVectorMatches(matches, terms);
        } catch (RuntimeException ex) {
            log.warn("Vector retrieval failed. Falling back to keyword retrieval. Error: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<RetrievedKnowledgeResponse> retrieveKeywordTopK(String question, int topK) {
        if (!StringUtils.hasText(question) || topK <= 0) {
            return List.of();
        }

        List<String> terms = tokenize(question);
        if (terms.isEmpty()) {
            return List.of();
        }

        return knowledgeBaseRepository
                .findByIsActiveTrueAndApprovalStatus(KnowledgeApprovalStatus.APPROVED)
                .stream()
                .map(kb -> new ScoredKnowledge(kb, score(kb, terms)))
                .filter(item -> item.score() > 0)
                .sorted(Comparator.comparingInt(ScoredKnowledge::score).reversed()
                        .thenComparing(item -> item.knowledgeBase().getKbId()))
                .limit(topK)
                .collect(Collectors.collectingAndThen(Collectors.toList(), items -> mapKeywordMatches(items, terms)));
    }

    private KnowledgeRetrievalResult result(List<RetrievedKnowledgeResponse> sources, RetrievalMode mode) {
        return KnowledgeRetrievalResult.builder()
                .sources(sources)
                .retrievalMode(mode)
                .build();
    }

    private EmbeddingClient resolveEmbeddingClient() {
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
            log.warn("Embedding provider {} is not available for vector retrieval. Falling back to MOCK.",
                    configuredClient.provider());
        }
        return mockClient;
    }

    private int score(KnowledgeBase kb, List<String> terms) {
        String title = normalize(kb.getKbTitle());
        String category = normalize(kb.getKbCategory());
        String source = normalize(kb.getKbSource());
        String content = normalize(kb.getKbContent());
        int score = 0;

        for (String term : terms) {
            if (title.contains(term)) {
                score += 5;
            }
            if (category.contains(term)) {
                score += 3;
            }
            if (source.contains(term)) {
                score += 2;
            }
            if (content.contains(term)) {
                score += 1;
            }
        }

        return score;
    }

    private List<RetrievedKnowledgeResponse> mapVectorMatches(
            List<KnowledgeSearchProjection> matches,
            List<String> terms) {
        List<RetrievedKnowledgeResponse> sources = new ArrayList<>();
        for (int i = 0; i < matches.size(); i++) {
            sources.add(mapToRetrieved(matches.get(i), terms, i + 1));
        }
        return sources;
    }

    private List<RetrievedKnowledgeResponse> mapKeywordMatches(List<ScoredKnowledge> matches, List<String> terms) {
        List<RetrievedKnowledgeResponse> sources = new ArrayList<>();
        for (int i = 0; i < matches.size(); i++) {
            ScoredKnowledge match = matches.get(i);
            sources.add(mapToRetrieved(match.knowledgeBase(), terms, i + 1, match.score()));
        }
        return sources;
    }

    private RetrievedKnowledgeResponse mapToRetrieved(
            KnowledgeSearchProjection row,
            List<String> terms,
            int rank) {
        KnowledgeScope scope = parseKnowledgeScope(row.getKnowledgeScope());
        return RetrievedKnowledgeResponse.builder()
                .kbId(row.getKbId())
                .kbTitle(row.getKbTitle())
                .kbCategory(row.getKbCategory())
                .kbSource(row.getKbSource())
                .snippet(buildSnippet(row.getKbContent(), terms))
                .rank(rank)
                .retrievalMode(RetrievalMode.VECTOR)
                .relevanceScore(row.getRelevanceScore())
                .relevanceLabel(vectorRelevanceLabel(row.getRelevanceScore()))
                .knowledgeScope(scope)
                .approvalStatus(parseApprovalStatus(row.getApprovalStatus()))
                .contributorDisplayName(contributorDisplayName(scope, row.getCreatedByName()))
                .build();
    }

    private RetrievedKnowledgeResponse mapToRetrieved(
            KnowledgeBase kb,
            List<String> terms,
            int rank,
            int keywordScore) {
        KnowledgeScope scope = kb.getKnowledgeScope();
        return RetrievedKnowledgeResponse.builder()
                .kbId(kb.getKbId())
                .kbTitle(kb.getKbTitle())
                .kbCategory(kb.getKbCategory())
                .kbSource(kb.getKbSource())
                .snippet(buildSnippet(kb.getKbContent(), terms))
                .rank(rank)
                .retrievalMode(RetrievalMode.KEYWORD_FALLBACK)
                .relevanceLabel(keywordRelevanceLabel(keywordScore))
                .knowledgeScope(scope)
                .approvalStatus(kb.getApprovalStatus())
                .contributorDisplayName(contributorDisplayName(
                        scope,
                        kb.getCreatedBy() == null ? null : kb.getCreatedBy().getFullName()))
                .build();
    }

    private KnowledgeScope parseKnowledgeScope(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return KnowledgeScope.valueOf(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private KnowledgeApprovalStatus parseApprovalStatus(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return KnowledgeApprovalStatus.valueOf(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String contributorDisplayName(KnowledgeScope scope, String createdByName) {
        if (scope == KnowledgeScope.INSTRUCTOR_CONTRIBUTED && StringUtils.hasText(createdByName)) {
            return createdByName.trim();
        }
        return null;
    }

    private String vectorRelevanceLabel(Double relevanceScore) {
        if (relevanceScore == null) {
            return "MATCH";
        }
        if (relevanceScore >= 0.75D) {
            return "HIGH";
        }
        if (relevanceScore >= 0.50D) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String keywordRelevanceLabel(int keywordScore) {
        if (keywordScore >= 8) {
            return "HIGH";
        }
        if (keywordScore >= 3) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String buildSnippet(String content, List<String> terms) {
        if (!StringUtils.hasText(content)) {
            return "";
        }

        String normalizedContent = normalize(content);
        int start = 0;
        for (String term : terms) {
            int index = normalizedContent.indexOf(term);
            if (index >= 0) {
                start = Math.max(0, index - 120);
                break;
            }
        }

        int end = Math.min(content.length(), start + SNIPPET_LENGTH);
        String snippet = content.substring(start, end).trim();
        if (start > 0) {
            snippet = "... " + snippet;
        }
        if (end < content.length()) {
            snippet = snippet + " ...";
        }
        return snippet;
    }

    private List<String> tokenize(String input) {
        return Arrays.stream(NON_WORD.split(normalize(input)))
                .filter(StringUtils::hasText)
                .filter(term -> term.length() >= 2)
                .filter(term -> !STOP_WORDS.contains(term))
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalize(String input) {
        if (input == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT);
    }

    private record ScoredKnowledge(KnowledgeBase knowledgeBase, int score) {
    }
}
