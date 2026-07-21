package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.repositories.AIEvaluationRepository;
import com.dbdesignassitant.backend.repositories.EvaluationDetailRepository;
import com.dbdesignassitant.backend.services.MockEvaluationService;
import com.dbdesignassitant.backend.utils.DiagramCardinalityNormalizer;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
                    "Sơ đồ chưa có entity nào. Hãy xác định các đối tượng chính trong đề bài trước khi thiết kế relationship.",
                    "Diagram"));
        }

        for (Map<String, Object> entity : entities) {
            String entityName = readString(entity, "name", "Unnamed entity");
            List<Map<String, Object>> attributes = readObjectList(entity, "attributes");
            boolean hasPrimaryKey = attributes.stream().anyMatch(attribute -> Boolean.TRUE.equals(attribute.get("isPrimaryKey")));
            if (!hasPrimaryKey) {
                details.add(new MockDetail(
                        "MISSING_PRIMARY_KEY",
                        "Entity nên có primary key để định danh mỗi bản ghi một cách rõ ràng.",
                        "Entity: " + entityName));
            }
        }

        if (relationships.isEmpty()) {
            details.add(new MockDetail(
                    "MISSING_RELATIONSHIP",
                    "Sơ đồ chưa có relationship. Hãy mô tả liên kết và ràng buộc giữa các entity nếu đề bài có nhiều đối tượng.",
                    "Relationships"));
        }

        for (Map<String, Object> relationship : relationships) {
            String relationshipName = readString(relationship, "name", "Unnamed relationship");
            var cardinality = DiagramCardinalityNormalizer.normalizeRelationship(relationship);
            if (!cardinality.hasCardinality()) {
                details.add(new MockDetail(
                        "MISSING_CARDINALITY",
                        "Relationship cần có cardinality để thể hiện ràng buộc mỗi đầu: 1-1, 0-1, 1-N hoặc 0-N.",
                        "Relationship: " + relationshipName));
                continue;
            }

            if (cardinality.isManyToMany()) {
                details.add(new MockDetail(
                        "MANY_TO_MANY_HINT",
                        "Relationship có nhiều bản ghi ở cả hai đầu thường cần cân nhắc bảng trung gian khi chuyển sang thiết kế logic.",
                        "Relationship: " + relationshipName));
            }
        }

        if (details.isEmpty()) {
            details.add(new MockDetail(
                    "MOCK_PASS",
                    "Đánh giá MOCK chưa phát hiện lỗi cấu trúc cơ bản trong sơ đồ hiện tại.",
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
