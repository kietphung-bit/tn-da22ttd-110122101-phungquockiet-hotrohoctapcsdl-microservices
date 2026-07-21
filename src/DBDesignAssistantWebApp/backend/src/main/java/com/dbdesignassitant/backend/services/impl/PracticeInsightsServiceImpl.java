package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.AdminPracticeInsightsResponse;
import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.EvaluationRoundRepository;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import com.dbdesignassitant.backend.services.PracticeInsightsService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PracticeInsightsServiceImpl implements PracticeInsightsService {
    private static final int RECENT_ROUNDS_LIMIT = 20;
    private static final int TOP_ISSUES_LIMIT = 10;
    private static final int ANONYMIZED_SUBMISSIONS_LIMIT = 20;
    private static final String TREND_DATE_SOURCE = "SUBMITTED_AT";
    private static final List<String> SKILL_ORDER = List.of(
            "ENTITY_MODELING",
            "ATTRIBUTE_AND_KEY",
            "RELATIONSHIP_MODELING",
            "CARDINALITY",
            "NORMALIZATION",
            "INTEGRITY_CONSTRAINT",
            "SCOPE_COMPLETENESS",
            "OTHER");

    private final SubmissionRepository submissionRepository;
    private final EvaluationRoundRepository evaluationRoundRepository;
    private final ExerciseRepository exerciseRepository;

    @Override
    public AdminPracticeInsightsResponse getAdminPracticeInsights(
            String from,
            String to,
            SubmissionStatus status,
            SubmissionStatus roundStatus,
            ExerciseSource exerciseSource,
            Long exerciseId,
            Long studentId,
            String provider,
            Boolean fallbackUsed) {
        LocalDateTime fromTime = parseBoundary(from, false);
        LocalDateTime toTime = parseBoundary(to, true);
        String statusName = enumName(status);
        String roundStatusName = enumName(roundStatus);
        String sourceName = enumName(exerciseSource);
        String normalizedProvider = normalizeProvider(provider);

        Object[] submissionSummary = submissionRepository.findAdminPracticeSubmissionSummary(
                fromTime,
                toTime,
                statusName,
                roundStatusName,
                sourceName,
                exerciseId,
                studentId,
                normalizedProvider,
                fallbackUsed);
        Object[] roundSummary = evaluationRoundRepository.findAdminPracticeRoundSummary(
                fromTime,
                toTime,
                statusName,
                roundStatusName,
                sourceName,
                exerciseId,
                studentId,
                normalizedProvider,
                fallbackUsed);

        long totalRounds = longAt(roundSummary, 0);
        long gradedRounds = longAt(roundSummary, 1);
        long failedRounds = longAt(roundSummary, 2);
        long processingRounds = longAt(roundSummary, 3);
        long fallbackRounds = longAt(roundSummary, 5);
        List<Object[]> issueRows = evaluationRoundRepository.findAdminPracticeTopIssueTypes(
                fromTime,
                toTime,
                statusName,
                roundStatusName,
                sourceName,
                exerciseId,
                studentId,
                normalizedProvider,
                fallbackUsed,
                TOP_ISSUES_LIMIT);
        List<Object[]> skillIssueRows = evaluationRoundRepository.findAdminPracticeIssueDetails(
                fromTime,
                toTime,
                statusName,
                roundStatusName,
                sourceName,
                exerciseId,
                studentId,
                normalizedProvider,
                fallbackUsed);

        return AdminPracticeInsightsResponse.builder()
                .summary(AdminPracticeInsightsResponse.Summary.builder()
                        .totalSubmissions(longAt(submissionSummary, 0))
                        .totalStudents(longAt(submissionSummary, 1))
                        .totalExercises(longAt(submissionSummary, 2))
                        .totalRounds(totalRounds)
                        .gradedRounds(gradedRounds)
                        .failedRounds(failedRounds)
                        .processingRounds(processingRounds)
                        .averageScore(decimalAt(roundSummary, 4))
                        .completionRate(rate(gradedRounds, totalRounds))
                        .failureRate(rate(failedRounds, totalRounds))
                        .fallbackRate(rate(fallbackRounds, totalRounds))
                        .build())
                .statusBreakdown(mapStatusBreakdown(submissionRepository.findAdminPracticeStatusBreakdown(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed)))
                .providerBreakdown(mapProviderBreakdown(evaluationRoundRepository.findAdminPracticeProviderBreakdown(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed)))
                .scoreDistribution(mapScoreDistribution(evaluationRoundRepository.findAdminPracticeScoreDistribution(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed)))
                .roundDistribution(mapRoundDistribution(evaluationRoundRepository.findAdminPracticeRoundDistribution(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed)))
                .trend(mapTrend(evaluationRoundRepository.findAdminPracticeTrend(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed)))
                .trendDateSource(TREND_DATE_SOURCE)
                .topIssueTypes(mapIssueTypes(issueRows))
                .skillAnalytics(mapSkillAnalytics(skillIssueRows, totalRounds))
                .recentRounds(mapAdminRecentRounds(evaluationRoundRepository.findAdminPracticeRecentRounds(
                        fromTime,
                        toTime,
                        statusName,
                        roundStatusName,
                        sourceName,
                        exerciseId,
                        studentId,
                        normalizedProvider,
                        fallbackUsed,
                        RECENT_ROUNDS_LIMIT)))
                .build();
    }

    @Override
    public InstructorExerciseInsightsResponse getInstructorExerciseInsights(
            Long currentInstructorId,
            Long exerciseId,
            String from,
            String to,
            SubmissionStatus submissionStatus,
            SubmissionStatus roundStatus,
            Integer roundNumber,
            String provider,
            Boolean fallbackUsed,
            PracticeInsightsScope scope) {
        if (roundNumber != null && roundNumber < 1) {
            throw new BadRequestException("roundNumber must be positive");
        }

        Long ownerId = exerciseRepository.findCreatedByIdByExerciseId(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (!ownerId.equals(currentInstructorId)) {
            throw new BadRequestException("You do not have permission to access this exercise");
        }

        PracticeInsightsScope selectedScope = scope == null ? PracticeInsightsScope.ALL : scope;
        LocalDateTime fromTime = parseBoundary(from, false);
        LocalDateTime toTime = parseBoundary(to, true);
        String submissionStatusName = enumName(submissionStatus);
        String roundStatusName = enumName(roundStatus);
        String normalizedProvider = normalizeProvider(provider);
        String scopeName = selectedScope.name();

        Object[] exerciseHeader = exerciseRepository.findPracticeInsightsExerciseHeader(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        long derivedAiExerciseCount = exerciseRepository.countDerivedAiExercises(exerciseId);

        Object[] submissionSummary = submissionRepository.findInstructorPracticeSubmissionSummary(
                exerciseId,
                scopeName,
                fromTime,
                toTime,
                submissionStatusName,
                roundStatusName,
                roundNumber,
                normalizedProvider,
                fallbackUsed);
        Object[] roundSummary = evaluationRoundRepository.findInstructorPracticeRoundSummary(
                exerciseId,
                scopeName,
                fromTime,
                toTime,
                submissionStatusName,
                roundStatusName,
                roundNumber,
                normalizedProvider,
                fallbackUsed);

        long directSubmissionCount = longAt(submissionSummary, 0);
        long derivedSubmissionCount = longAt(submissionSummary, 1);
        long totalRounds = longAt(roundSummary, 0);
        long fallbackRounds = longAt(roundSummary, 5);
        long includedSubmissionCount = directSubmissionCount + derivedSubmissionCount;
        List<Object[]> issueRows = evaluationRoundRepository.findInstructorPracticeTopIssueTypes(
                exerciseId,
                scopeName,
                fromTime,
                toTime,
                submissionStatusName,
                roundStatusName,
                roundNumber,
                normalizedProvider,
                fallbackUsed,
                TOP_ISSUES_LIMIT);
        List<Object[]> skillIssueRows = evaluationRoundRepository.findInstructorPracticeIssueDetails(
                exerciseId,
                scopeName,
                fromTime,
                toTime,
                submissionStatusName,
                roundStatusName,
                roundNumber,
                normalizedProvider,
                fallbackUsed);

        return InstructorExerciseInsightsResponse.builder()
                .exercise(InstructorExerciseInsightsResponse.ExerciseSummary.builder()
                        .exerciseId(longAt(exerciseHeader, 0))
                        .exerciseCode(stringAt(exerciseHeader, 1))
                        .exerciseTitle(stringAt(exerciseHeader, 2))
                        .exerciseSource(exerciseSourceAt(exerciseHeader, 3))
                        .isPublished(booleanAt(exerciseHeader, 4))
                        .build())
                .scope(InstructorExerciseInsightsResponse.ScopeSummary.builder()
                        .selectedScope(selectedScope)
                        .directExerciseId(exerciseId)
                        .derivedAiExerciseCount(derivedAiExerciseCount)
                        .includedSubmissionCount(includedSubmissionCount)
                        .build())
                .summary(InstructorExerciseInsightsResponse.Summary.builder()
                        .directSubmissionCount(directSubmissionCount)
                        .derivedAiExerciseCount(derivedAiExerciseCount)
                        .derivedSubmissionCount(derivedSubmissionCount)
                        .participantCount(longAt(submissionSummary, 2))
                        .gradedCount(longAt(submissionSummary, 3))
                        .failedCount(longAt(submissionSummary, 4))
                        .processingCount(longAt(submissionSummary, 5))
                        .totalRounds(totalRounds)
                        .averageScore(decimalAt(roundSummary, 4))
                        .fallbackRate(rate(fallbackRounds, totalRounds))
                        .build())
                .scoreDistribution(mapScoreDistribution(
                        evaluationRoundRepository.findInstructorPracticeScoreDistribution(
                                exerciseId,
                                scopeName,
                                fromTime,
                                toTime,
                                submissionStatusName,
                                roundStatusName,
                                roundNumber,
                                normalizedProvider,
                                fallbackUsed)))
                .roundDistribution(mapRoundDistribution(
                        evaluationRoundRepository.findInstructorPracticeRoundDistribution(
                                exerciseId,
                                scopeName,
                                fromTime,
                                toTime,
                                submissionStatusName,
                                roundStatusName,
                                roundNumber,
                                normalizedProvider,
                                fallbackUsed)))
                .trend(mapTrend(evaluationRoundRepository.findInstructorPracticeTrend(
                        exerciseId,
                        scopeName,
                        fromTime,
                        toTime,
                        submissionStatusName,
                        roundStatusName,
                        roundNumber,
                        normalizedProvider,
                        fallbackUsed)))
                .trendDateSource(TREND_DATE_SOURCE)
                .topIssueTypes(mapIssueTypes(issueRows))
                .skillAnalytics(mapSkillAnalytics(skillIssueRows, totalRounds))
                .anonymizedSubmissionSummaries(mapAnonymizedSubmissionSummaries(
                        submissionRepository.findInstructorAnonymizedSubmissionSummaries(
                                exerciseId,
                                scopeName,
                                fromTime,
                                toTime,
                                submissionStatusName,
                                roundStatusName,
                                roundNumber,
                                normalizedProvider,
                                fallbackUsed,
                                ANONYMIZED_SUBMISSIONS_LIMIT)))
                .build();
    }

    private List<AdminPracticeInsightsResponse.StatusBreakdownItem> mapStatusBreakdown(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.StatusBreakdownItem.builder()
                        .status(submissionStatusAt(row, 0))
                        .count(longAt(row, 1))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.ProviderBreakdownItem> mapProviderBreakdown(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.ProviderBreakdownItem.builder()
                        .provider(stringAt(row, 0))
                        .model(stringAt(row, 1))
                        .roundCount(longAt(row, 2))
                        .gradedCount(longAt(row, 3))
                        .failedCount(longAt(row, 4))
                        .fallbackCount(longAt(row, 5))
                        .averageScore(decimalAt(row, 6))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.ScoreDistributionItem> mapScoreDistribution(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.ScoreDistributionItem.builder()
                        .bucket(stringAt(row, 0))
                        .minScore(decimalAt(row, 1))
                        .maxScore(decimalAt(row, 2))
                        .roundCount(longAt(row, 3))
                        .affectedSubmissionCount(longAt(row, 4))
                        .averageScore(decimalAt(row, 5))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.RoundDistributionItem> mapRoundDistribution(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.RoundDistributionItem.builder()
                        .roundNumber(integerAt(row, 0))
                        .roundCount(longAt(row, 1))
                        .gradedCount(longAt(row, 2))
                        .failedCount(longAt(row, 3))
                        .processingCount(longAt(row, 4))
                        .averageScore(decimalAt(row, 5))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.TrendItem> mapTrend(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.TrendItem.builder()
                        .date(localDateAt(row, 0))
                        .submissionCount(longAt(row, 1))
                        .gradedRoundCount(longAt(row, 2))
                        .averageScore(decimalAt(row, 3))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.IssueTypeItem> mapIssueTypes(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminPracticeInsightsResponse.IssueTypeItem.builder()
                        .errorType(stringAt(row, 0))
                        .count(longAt(row, 1))
                        .affectedSubmissionCount(longAt(row, 2))
                        .affectedRoundCount(longAt(row, 3))
                        .build())
                .toList();
    }

    private List<AdminPracticeInsightsResponse.SkillAnalyticsItem> mapSkillAnalytics(
            List<Object[]> rows,
            long totalRounds) {
        Map<String, SkillAggregate> aggregates = new LinkedHashMap<>();
        for (Object[] row : safeRows(rows)) {
            String errorType = normalizeIssueType(stringAt(row, 2));
            String skillCode = skillCodeForErrorType(errorType);
            if (skillCode == null) {
                continue;
            }

            SkillAggregate aggregate = aggregates.computeIfAbsent(skillCode, SkillAggregate::new);
            aggregate.issueCount++;
            long roundId = longAt(row, 0);
            long submissionId = longAt(row, 1);
            if (roundId > 0) {
                aggregate.roundIds.add(roundId);
            }
            if (submissionId > 0) {
                aggregate.submissionIds.add(submissionId);
            }
            aggregate.errorTypeCounts.merge(errorType, 1L, Long::sum);
        }

        List<SkillAggregate> sorted = new ArrayList<>(aggregates.values());
        sorted.sort(Comparator
                .comparingLong((SkillAggregate aggregate) -> aggregate.issueCount)
                .reversed()
                .thenComparingInt(aggregate -> skillOrder(aggregate.skillCode))
                .thenComparing(aggregate -> aggregate.skillCode));

        return sorted.stream()
                .map(aggregate -> AdminPracticeInsightsResponse.SkillAnalyticsItem.builder()
                        .skillCode(aggregate.skillCode)
                        .skillName(skillNameForCode(aggregate.skillCode))
                        .issueCount(aggregate.issueCount)
                        .affectedRoundCount((long) aggregate.roundIds.size())
                        .affectedSubmissionCount((long) aggregate.submissionIds.size())
                        .commonErrorTypes(commonErrorTypes(aggregate))
                        .impactRate(rate(aggregate.roundIds.size(), totalRounds))
                        .build())
                .toList();
    }

    private List<String> commonErrorTypes(SkillAggregate aggregate) {
        return aggregate.errorTypeCounts.entrySet().stream()
                .sorted((left, right) -> {
                    int countComparison = Long.compare(right.getValue(), left.getValue());
                    if (countComparison != 0) {
                        return countComparison;
                    }
                    return left.getKey().compareTo(right.getKey());
                })
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();
    }

    private String skillCodeForErrorType(String errorType) {
        String normalized = normalizeIssueType(errorType);
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.contains("PASS")
                || normalized.contains("NO_ERROR")
                || normalized.contains("NO_ISSUE")
                || normalized.contains("NO_PROBLEM")) {
            return null;
        }
        if (normalized.contains("CARDINALITY")
                || normalized.contains("PARTICIPATION")
                || normalized.contains("OPTIONALITY")
                || normalized.contains("MIN_MAX")
                || normalized.contains("ONE_TO_MANY")
                || normalized.contains("MANY_TO_MANY")
                || normalized.contains("ONE_TO_ONE")) {
            return "CARDINALITY";
        }
        if (normalized.contains("RELATIONSHIP")
                || normalized.contains("ASSOCIATION")
                || normalized.contains("ASSOCIATIVE")
                || normalized.contains("BRIDGE")
                || normalized.contains("JOIN_TABLE")) {
            return "RELATIONSHIP_MODELING";
        }
        if (normalized.contains("NORMAL")
                || normalized.contains("1NF")
                || normalized.contains("2NF")
                || normalized.contains("3NF")
                || normalized.contains("BCNF")
                || normalized.contains("DEPENDENCY")
                || normalized.contains("REPEATING_GROUP")
                || normalized.contains("MULTIVALUED")) {
            return "NORMALIZATION";
        }
        if (normalized.contains("INTEGRITY")
                || normalized.contains("CONSTRAINT")
                || normalized.contains("FOREIGN_KEY")
                || normalized.contains("REFERENTIAL")
                || normalized.contains("UNIQUE")
                || normalized.contains("NOT_NULL")
                || normalized.contains("CHECK")) {
            return "INTEGRITY_CONSTRAINT";
        }
        if (normalized.contains("ATTRIBUTE")
                || normalized.contains("PRIMARY_KEY")
                || normalized.contains("PRIMARY")
                || normalized.contains("MISSING_PK")
                || normalized.contains("_PK")
                || normalized.endsWith("PK")
                || normalized.contains("_KEY")
                || normalized.endsWith("KEY")) {
            return "ATTRIBUTE_AND_KEY";
        }
        if (normalized.contains("ENTITY")
                || normalized.contains("TABLE")
                || normalized.contains("WEAK_ENTITY")) {
            return "ENTITY_MODELING";
        }
        if (normalized.contains("SCOPE")
                || normalized.contains("COMPLETE")
                || normalized.contains("INCOMPLETE")
                || normalized.contains("REQUIREMENT")
                || normalized.contains("MISSING")
                || normalized.contains("OMITTED")) {
            return "SCOPE_COMPLETENESS";
        }
        return "OTHER";
    }

    private String normalizeIssueType(String errorType) {
        if (errorType == null || errorType.isBlank()) {
            return "";
        }
        return errorType.trim()
                .replace('-', '_')
                .replace(' ', '_')
                .replace('/', '_')
                .toUpperCase(Locale.ROOT);
    }

    private String skillNameForCode(String skillCode) {
        return switch (skillCode) {
            case "ENTITY_MODELING" -> "Entity modeling";
            case "ATTRIBUTE_AND_KEY" -> "Attributes and keys";
            case "RELATIONSHIP_MODELING" -> "Relationship modeling";
            case "CARDINALITY" -> "Cardinality";
            case "NORMALIZATION" -> "Normalization";
            case "INTEGRITY_CONSTRAINT" -> "Integrity constraints";
            case "SCOPE_COMPLETENESS" -> "Scope completeness";
            default -> "Other issues";
        };
    }

    private int skillOrder(String skillCode) {
        int index = SKILL_ORDER.indexOf(skillCode);
        return index >= 0 ? index : SKILL_ORDER.size();
    }

    private List<AdminEvaluationRoundResponse> mapAdminRecentRounds(List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> AdminEvaluationRoundResponse.builder()
                        .roundId(longAt(row, 0))
                        .submissionId(longAt(row, 1))
                        .studentId(longAt(row, 2))
                        .studentName(stringAt(row, 3))
                        .studentEmail(stringAt(row, 4))
                        .roundNumber(integerAt(row, 5))
                        .roundStatus(submissionStatusAt(row, 6))
                        .overallScore(decimalAt(row, 7))
                        .provider(stringAt(row, 8))
                        .model(stringAt(row, 9))
                        .fallbackUsed(booleanAt(row, 10))
                        .fallbackFrom(stringAt(row, 11))
                        .submittedAt(localDateTimeAt(row, 12))
                        .gradedAt(localDateTimeAt(row, 13))
                        .build())
                .toList();
    }

    private List<InstructorExerciseInsightsResponse.AnonymizedSubmissionSummary> mapAnonymizedSubmissionSummaries(
            List<Object[]> rows) {
        return safeRows(rows).stream()
                .map(row -> InstructorExerciseInsightsResponse.AnonymizedSubmissionSummary.builder()
                        .submissionId(longAt(row, 0))
                        .exerciseScope(practiceScopeAt(row, 1))
                        .submissionStatus(submissionStatusAt(row, 2))
                        .roundsUsed(integerAt(row, 3))
                        .latestRoundStatus(submissionStatusAt(row, 4))
                        .latestScore(decimalAt(row, 5))
                        .submittedAt(localDateTimeAt(row, 6))
                        .gradedAt(localDateTimeAt(row, 7))
                        .build())
                .toList();
    }

    private static class SkillAggregate {
        private final String skillCode;
        private long issueCount;
        private final Set<Long> roundIds = new HashSet<>();
        private final Set<Long> submissionIds = new HashSet<>();
        private final Map<String, Long> errorTypeCounts = new HashMap<>();

        private SkillAggregate(String skillCode) {
            this.skillCode = skillCode;
        }
    }

    private List<Object[]> safeRows(List<Object[]> rows) {
        return rows == null ? List.of() : rows;
    }

    private LocalDateTime parseBoundary(String value, boolean endOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            return OffsetDateTime.parse(trimmed, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // Try local date-time next.
        }
        try {
            return LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            // Try date-only next.
        }
        try {
            LocalDate date = LocalDate.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE);
            return endOfDay ? date.atTime(LocalTime.MAX) : date.atStartOfDay();
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Invalid date filter: " + value);
        }
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            return null;
        }
        return provider.trim().toUpperCase(Locale.ROOT);
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private BigDecimal rate(long numerator, long denominator) {
        if (denominator <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), 4, RoundingMode.HALF_UP);
    }

    private long longAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private Integer integerAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        return value instanceof Number number ? number.intValue() : null;
    }

    private BigDecimal decimalAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return null;
    }

    private String stringAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        return value == null ? null : String.valueOf(value);
    }

    private Boolean booleanAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return null;
    }

    private LocalDateTime localDateTimeAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        return null;
    }

    private LocalDate localDateAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        return value == null ? null : LocalDate.parse(String.valueOf(value));
    }

    private SubmissionStatus submissionStatusAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof SubmissionStatus status) {
            return status;
        }
        return value == null ? null : SubmissionStatus.valueOf(String.valueOf(value));
    }

    private ExerciseSource exerciseSourceAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof ExerciseSource source) {
            return source;
        }
        return value == null ? null : ExerciseSource.valueOf(String.valueOf(value));
    }

    private PracticeInsightsScope practiceScopeAt(Object[] row, int index) {
        Object value = valueAt(row, index);
        if (value instanceof PracticeInsightsScope scope) {
            return scope;
        }
        return value == null ? null : PracticeInsightsScope.valueOf(String.valueOf(value));
    }

    private Object valueAt(Object[] row, int index) {
        Object[] normalized = normalizeRow(row);
        return normalized == null || normalized.length <= index ? null : normalized[index];
    }

    private Object[] normalizeRow(Object[] row) {
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) {
            return nested;
        }
        return row;
    }
}
