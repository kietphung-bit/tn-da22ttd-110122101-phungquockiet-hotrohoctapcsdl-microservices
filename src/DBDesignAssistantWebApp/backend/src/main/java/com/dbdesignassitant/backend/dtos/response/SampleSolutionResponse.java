package com.dbdesignassitant.backend.dtos.response;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SampleSolutionResponse {
    private Long sampleSolutionId;
    private Long exerciseId;
    private String exerciseCode;
    private Map<String, Object> solutionData;
}
