package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminPracticeInsightsResponse {
    private Summary summary;
    private List<StatusBreakdownItem> statusBreakdown;
    private List<ProviderBreakdownItem> providerBreakdown;
    private List<ScoreDistributionItem> scoreDistribution;
    private List<RoundDistributionItem> roundDistribution;
    private List<TrendItem> trend;
    private String trendDateSource;
    private List<IssueTypeItem> topIssueTypes;
    private List<SkillAnalyticsItem> skillAnalytics;
    private List<AdminEvaluationRoundResponse> recentRounds;

    @Data
    @Builder
    public static class Summary {
        private Long totalSubmissions;
        private Long totalStudents;
        private Long totalExercises;
        private Long totalRounds;
        private Long gradedRounds;
        private Long failedRounds;
        private Long processingRounds;
        private BigDecimal averageScore;
        private BigDecimal completionRate;
        private BigDecimal failureRate;
        private BigDecimal fallbackRate;
    }

    @Data
    @Builder
    public static class StatusBreakdownItem {
        private SubmissionStatus status;
        private Long count;
    }

    @Data
    @Builder
    public static class ProviderBreakdownItem {
        private String provider;
        private String model;
        private Long roundCount;
        private Long gradedCount;
        private Long failedCount;
        private Long fallbackCount;
        private BigDecimal averageScore;
    }

    @Data
    @Builder
    public static class IssueTypeItem {
        private String errorType;
        private Long count;
        private Long affectedSubmissionCount;
        private Long affectedRoundCount;
    }

    @Data
    @Builder
    public static class SkillAnalyticsItem {
        private String skillCode;
        private String skillName;
        private Long issueCount;
        private Long affectedRoundCount;
        private Long affectedSubmissionCount;
        private List<String> commonErrorTypes;
        private BigDecimal impactRate;
    }

    @Data
    @Builder
    public static class ScoreDistributionItem {
        private String bucket;
        private BigDecimal minScore;
        private BigDecimal maxScore;
        private Long roundCount;
        private Long affectedSubmissionCount;
        private BigDecimal averageScore;
    }

    @Data
    @Builder
    public static class RoundDistributionItem {
        private Integer roundNumber;
        private Long roundCount;
        private Long gradedCount;
        private Long failedCount;
        private Long processingCount;
        private BigDecimal averageScore;
    }

    @Data
    @Builder
    public static class TrendItem {
        private LocalDate date;
        private Long submissionCount;
        private Long gradedRoundCount;
        private BigDecimal averageScore;
    }
}
