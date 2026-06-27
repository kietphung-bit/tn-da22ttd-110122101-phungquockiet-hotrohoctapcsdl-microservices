package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubmissionStatusResponse {
    private Long submissionId;
    private SubmissionStatus submissionStatus;
    private LocalDateTime submittedAt;
    private boolean evaluationReady;
    private Integer currentRound;
    private Integer roundsUsed;
    private Integer maxRounds;
    private Boolean canResubmit;
}
