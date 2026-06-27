package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.repositories.AIEvaluationRepository;
import com.dbdesignassitant.backend.repositories.EvaluationDetailRepository;
import com.dbdesignassitant.backend.services.MockEvaluationService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MockEvaluationServiceImpl implements MockEvaluationService {

    private final AIEvaluationRepository aiEvaluationRepository;
    private final EvaluationDetailRepository evaluationDetailRepository;

    @Override
    @Transactional
    public AIEvaluation evaluateAndPersist(Submission submission) {
        List<MockDetail> mockDetails = evaluateDiagram(submission.getDiagramData());
        BigDecimal overallScore = calculateScore(mockDetails);

        AIEvaluation evaluation = aiEvaluationRepository.findBySubmission_SubmissionId(submission.getSubmissionId())
                .orElseGet(() -> AIEvaluation.builder()
                        .submission(submission)
                        .build());
        evaluation.setOverallScore(overallScore);
        evaluation.setEvaluatedAt(LocalDateTime.now());
        evaluation.setProvider("MOCK");
        evaluation.setModel("mock-rule-based");
        evaluation.setFallbackUsed(false);
        evaluation.setFallbackFrom(null);
        AIEvaluation savedEvaluation = aiEvaluationRepository.save(evaluation);

        evaluationDetailRepository.deleteByAiEvaluation_EvaluationId(savedEvaluation.getEvaluationId());
        List<EvaluationDetail> details = mockDetails.stream()
                .map(detail -> EvaluationDetail.builder()
                        .aiEvaluation(savedEvaluation)
                        .errorType(detail.errorType())
                        .evaDescription(detail.description())
                        .errorLocation(detail.location())
                        .build())
                .toList();
        evaluationDetailRepository.saveAll(details);

        return savedEvaluation;
    }

    @Override
    public List<EvaluationDetail> getDetails(Long evaluationId) {
        return evaluationDetailRepository.findByAiEvaluation_EvaluationId(evaluationId);
    }

    private List<MockDetail> evaluateDiagram(Map<String, Object> diagramData) {
        List<MockDetail> details = new ArrayList<>();
        List<Map<String, Object>> entities = readObjectList(diagramData, "entities");
        List<Map<String, Object>> relationships = readObjectList(diagramData, "relationships");

        if (entities.isEmpty()) {
            details.add(new MockDetail(
                    "MISSING_ENTITY",
                    "Diagram chua co entity nao. Hay xac dinh cac doi tuong chinh trong de bai truoc khi thiet ke relationship.",
                    "Diagram"));
        }

        for (Map<String, Object> entity : entities) {
            String entityName = readString(entity, "name", "Unnamed entity");
            List<Map<String, Object>> attributes = readObjectList(entity, "attributes");
            boolean hasPrimaryKey = attributes.stream().anyMatch(attribute -> Boolean.TRUE.equals(attribute.get("isPrimaryKey")));
            if (!hasPrimaryKey) {
                details.add(new MockDetail(
                        "MISSING_PRIMARY_KEY",
                        "Entity nen co primary key de dinh danh moi ban ghi mot cach ro rang.",
                        "Entity: " + entityName));
            }
        }

        if (relationships.isEmpty()) {
            details.add(new MockDetail(
                    "MISSING_RELATIONSHIP",
                    "Diagram chua co relationship. Hay mo ta lien ket va rang buoc giua cac entity neu de bai co nhieu doi tuong.",
                    "Relationships"));
        }

        for (Map<String, Object> relationship : relationships) {
            String relationshipName = readString(relationship, "name", "Unnamed relationship");
            String cardinality = readString(relationship, "cardinality", "");
            if (cardinality.isBlank()) {
                details.add(new MockDetail(
                        "MISSING_CARDINALITY",
                        "Relationship can co cardinality de the hien rang buoc 1-1, 1-N, N-1 hoac N-N.",
                        "Relationship: " + relationshipName));
                continue;
            }

            String normalizedCardinality = cardinality.toUpperCase(Locale.ROOT).replace(" ", "");
            if ("N-N".equals(normalizedCardinality) || "M-N".equals(normalizedCardinality)) {
                details.add(new MockDetail(
                        "MANY_TO_MANY_HINT",
                        "Relationship N-N thuong can can nhac bang trung gian khi chuyen sang thiet ke logic.",
                        "Relationship: " + relationshipName));
            }
        }

        if (details.isEmpty()) {
            details.add(new MockDetail(
                    "MOCK_PASS",
                    "Danh gia demo/MOCK khong phat hien loi cau truc co ban trong diagram hien tai.",
                    "Diagram"));
        }

        return details;
    }

    private BigDecimal calculateScore(List<MockDetail> details) {
        int penalty = details.stream()
                .mapToInt(detail -> switch (detail.errorType()) {
                    case "MISSING_ENTITY" -> 40;
                    case "MISSING_PRIMARY_KEY" -> 15;
                    case "MISSING_RELATIONSHIP" -> 15;
                    case "MISSING_CARDINALITY" -> 10;
                    case "MANY_TO_MANY_HINT" -> 5;
                    default -> 0;
                })
                .sum();
        return BigDecimal.valueOf(Math.max(0, 100 - penalty));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readObjectList(Map<String, Object> source, String key) {
        if (source == null) {
            return List.of();
        }
        Object value = source.get(key);
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        return items.stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .toList();
    }

    private String readString(Map<String, Object> source, String key, String fallback) {
        Object value = source.get(key);
        if (value instanceof String text && !text.isBlank()) {
            return text;
        }
        return fallback;
    }

    private record MockDetail(String errorType, String description, String location) {
    }
}
