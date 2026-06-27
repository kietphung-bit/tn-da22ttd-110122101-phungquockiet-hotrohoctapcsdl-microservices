package com.dbdesignassitant.backend.dtos.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EvaluationDetailResponse {
    private Long detailId;
    private String errorType;
    private String evaDescription;
    private String errorLocation;
}
