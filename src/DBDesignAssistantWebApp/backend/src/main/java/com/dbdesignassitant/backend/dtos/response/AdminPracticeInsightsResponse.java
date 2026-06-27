package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminPracticeInsightsResponse {
    private Summary summary;
    private List<StatusBreakdownItem> statusBreakdown;
    private List<ProviderBreakdownItem> providerBreakdown;
    private List<IssueTypeItem> topIssueTypes;
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
    }
}
