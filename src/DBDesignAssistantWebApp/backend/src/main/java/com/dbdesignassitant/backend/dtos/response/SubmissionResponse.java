package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubmissionResponse {
    private Long submissionId;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private Long exerciseId;
    private String exerciseCode;
    private String exerciseTitle;
    private Map<String, Object> diagramData;
    private SubmissionStatus submissionStatus;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private Boolean studentArchived;
    private LocalDateTime studentArchivedAt;
    private Integer currentRound;
    private Integer roundsUsed;
    private Integer maxRounds;
    private Boolean canResubmit;
    // Included when fetching detail with evaluation
    private AIEvaluationResponse evaluation;
    private List<EvaluationRoundResponse> evaluationRounds;
}
