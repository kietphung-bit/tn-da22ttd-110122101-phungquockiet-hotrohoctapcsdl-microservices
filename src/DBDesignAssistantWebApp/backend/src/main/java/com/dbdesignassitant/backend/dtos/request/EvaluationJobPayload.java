package com.dbdesignassitant.backend.dtos.request;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationJobPayload {
    private String jobId;
    private String idempotencyKey;
    private Long submissionId;
    private Long roundId;
    private Integer roundNumber;
    private Long userId;
    private Long exerciseId;
    private Map<String, Object> diagramData;
    private String queuedAt;
    private Integer attempt;
}
