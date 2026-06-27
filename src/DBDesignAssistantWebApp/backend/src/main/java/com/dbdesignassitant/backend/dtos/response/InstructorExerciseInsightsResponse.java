package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InstructorExerciseInsightsResponse {
    private ExerciseSummary exercise;
    private ScopeSummary scope;
    private Summary summary;
    private List<AdminPracticeInsightsResponse.IssueTypeItem> topIssueTypes;
    private List<AnonymizedSubmissionSummary> anonymizedSubmissionSummaries;

    @Data
    @Builder
    public static class ExerciseSummary {
        private Long exerciseId;
        private String exerciseCode;
        private String exerciseTitle;
        private ExerciseSource exerciseSource;
        private Boolean isPublished;
    }

    @Data
    @Builder
    public static class ScopeSummary {
        private PracticeInsightsScope selectedScope;
        private Long directExerciseId;
        private Long derivedAiExerciseCount;
        private Long includedSubmissionCount;
    }

    @Data
    @Builder
    public static class Summary {
        private Long directSubmissionCount;
        private Long derivedAiExerciseCount;
        private Long derivedSubmissionCount;
        private Long participantCount;
        private Long gradedCount;
        private Long failedCount;
        private Long processingCount;
        private Long totalRounds;
        private BigDecimal averageScore;
        private BigDecimal fallbackRate;
    }

    @Data
    @Builder
    public static class AnonymizedSubmissionSummary {
        private Long submissionId;
        private PracticeInsightsScope exerciseScope;
        private SubmissionStatus submissionStatus;
        private Integer roundsUsed;
        private SubmissionStatus latestRoundStatus;
        private BigDecimal latestScore;
        private LocalDateTime submittedAt;
        private LocalDateTime gradedAt;
    }
}
