package com.dbdesignassitant.backend.dtos.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AIEvaluationResponse {
    private Long evaluationId;
    private Long submissionId;
    private Long roundId;
    private Integer roundNumber;
    private Integer roundsUsed;
    private Integer maxRounds;
    private Boolean canResubmit;
    private BigDecimal overallScore;
    private LocalDateTime evaluatedAt;
    private String provider;
    private String model;
    private Boolean fallbackUsed;
    private String fallbackFrom;
    private List<EvaluationDetailResponse> details;
}
