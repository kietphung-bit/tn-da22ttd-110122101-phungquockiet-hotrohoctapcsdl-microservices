package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EvaluationRoundResponse {
    private Long roundId;
    private Long submissionId;
    private Integer roundNumber;
    private SubmissionStatus roundStatus;
    private BigDecimal overallScore;
    private String provider;
    private String model;
    private Boolean fallbackUsed;
    private String fallbackFrom;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;
    private List<EvaluationDetailResponse> details;
}
