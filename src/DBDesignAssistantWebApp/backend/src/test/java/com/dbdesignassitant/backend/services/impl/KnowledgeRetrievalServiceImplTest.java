package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RetrievalMode;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.KnowledgeSearchProjection;
import com.dbdesignassitant.backend.services.EmbeddingClient;
import com.dbdesignassitant.backend.services.PgVectorService;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KnowledgeRetrievalServiceImplTest {

    @Mock
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Mock
    private EmbeddingClient embeddingClient;

    @Mock
    private PgVectorService pgVectorService;

    private AiProperties aiProperties;
    private KnowledgeRetrievalServiceImpl service;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        service = new KnowledgeRetrievalServiceImpl(
                knowledgeBaseRepository,
                aiProperties,
                List.of(embeddingClient),
                pgVectorService);
    }

    @Test
    void keywordRetrievalRanksApprovedActiveSourcesAndAddsSafeMetadata() {
        when(pgVectorService.isPgVectorReady()).thenReturn(false);
        when(knowledgeBaseRepository.findByIsActiveTrueAndApprovalStatus(KnowledgeApprovalStatus.APPROVED))
                .thenReturn(List.of(
                        knowledge(
                                2L,
                                "Chuan hoa 1NF",
                                "Normalization",
                                "Lecture 1",
                                "1NF yeu cau moi o du lieu la nguyen to va tranh lap nhom.",
                                KnowledgeScope.INSTRUCTOR_CONTRIBUTED,
                                instructor("Giang vien A")),
                        knowledge(
                                1L,
                                "ERD overview",
                                "ERD",
                                "System seed",
                                "ERD mo ta thuc the, thuoc tinh va moi quan he trong co so du lieu.",
                                KnowledgeScope.SYSTEM,
                                instructor("Admin User"))));

        KnowledgeRetrievalResult result = service.retrieveTopK("chuan hoa 1NF la gi", 3);

        assertEquals(RetrievalMode.KEYWORD_FALLBACK, result.getRetrievalMode());
        assertEquals(1, result.getSources().size());

        RetrievedKnowledgeResponse source = result.getSources().get(0);
        assertEquals(2L, source.getKbId());
        assertEquals(1, source.getRank());
        assertEquals(RetrievalMode.KEYWORD_FALLBACK, source.getRetrievalMode());
        assertEquals(KnowledgeScope.INSTRUCTOR_CONTRIBUTED, source.getKnowledgeScope());
        assertEquals(KnowledgeApprovalStatus.APPROVED, source.getApprovalStatus());
        assertEquals("Giang vien A", source.getContributorDisplayName());
        assertEquals("HIGH", source.getRelevanceLabel());

        verify(knowledgeBaseRepository).findByIsActiveTrueAndApprovalStatus(KnowledgeApprovalStatus.APPROVED);
    }

    @Test
    void vectorRetrievalUsesProjectedSimilarityScoreWithoutFakingKeywordScore() {
        when(pgVectorService.isPgVectorReady()).thenReturn(true);
        when(pgVectorService.isKnowledgeBaseVectorColumnReady()).thenReturn(true);
        when(embeddingClient.provider()).thenReturn(AiProvider.MOCK);
        when(embeddingClient.isAvailable()).thenReturn(true);
        when(embeddingClient.embed("ERD la gi")).thenReturn(List.of(0.1D, 0.2D));
        when(knowledgeBaseRepository.findTopKProjectedByVectorSimilarity(anyString(), eq(2)))
                .thenReturn(List.of(projectedSource(5L, 0.86D)));

        KnowledgeRetrievalResult result = service.retrieveTopK("ERD la gi", 2);

        assertEquals(RetrievalMode.VECTOR, result.getRetrievalMode());
        assertEquals(1, result.getSources().size());

        RetrievedKnowledgeResponse source = result.getSources().get(0);
        assertEquals(5L, source.getKbId());
        assertEquals(1, source.getRank());
        assertEquals(RetrievalMode.VECTOR, source.getRetrievalMode());
        assertEquals(0.86D, source.getRelevanceScore());
        assertEquals("HIGH", source.getRelevanceLabel());
        assertEquals(KnowledgeScope.INSTRUCTOR_CONTRIBUTED, source.getKnowledgeScope());
        assertEquals(KnowledgeApprovalStatus.APPROVED, source.getApprovalStatus());
        assertEquals("Giang vien B", source.getContributorDisplayName());
    }

    @Test
    void retrievedKnowledgeResponseDoesNotExposeReviewOrRawVectorFields() {
        List<String> fieldNames = Arrays.stream(RetrievedKnowledgeResponse.class.getDeclaredFields())
                .map(Field::getName)
                .toList();

        assertFalse(fieldNames.contains("reviewedById"));
        assertFalse(fieldNames.contains("reviewedByName"));
        assertFalse(fieldNames.contains("reviewedAt"));
        assertFalse(fieldNames.contains("reviewNote"));
        assertFalse(fieldNames.contains("kbVector"));
        assertFalse(fieldNames.contains("createdById"));
    }

    private KnowledgeBase knowledge(
            Long id,
            String title,
            String category,
            String source,
            String content,
            KnowledgeScope scope,
            User createdBy) {
        return KnowledgeBase.builder()
                .kbId(id)
                .kbTitle(title)
                .kbCategory(category)
                .kbSource(source)
                .kbContent(content)
                .isActive(true)
                .approvalStatus(KnowledgeApprovalStatus.APPROVED)
                .knowledgeScope(scope)
                .createdBy(createdBy)
                .build();
    }

    private User instructor(String fullName) {
        return User.builder()
                .userId(10L)
                .fullName(fullName)
                .userEmail("instructor@dbdesign.local")
                .passwordHash("hash")
                .build();
    }

    private KnowledgeSearchProjection projectedSource(Long id, Double relevanceScore) {
        return new KnowledgeSearchProjection() {
            @Override
            public Long getKbId() {
                return id;
            }

            @Override
            public String getKbTitle() {
                return "ERD instructor note";
            }

            @Override
            public String getKbContent() {
                return "ERD la mo hinh mo ta thuc the, thuoc tinh va quan he.";
            }

            @Override
            public String getKbSource() {
                return "Lecture note";
            }

            @Override
            public String getKbCategory() {
                return "ERD";
            }

            @Override
            public String getApprovalStatus() {
                return "APPROVED";
            }

            @Override
            public String getKnowledgeScope() {
                return "INSTRUCTOR_CONTRIBUTED";
            }

            @Override
            public String getCreatedByName() {
                return "Giang vien B";
            }

            @Override
            public Double getRelevanceScore() {
                return relevanceScore;
            }
        };
    }
}
