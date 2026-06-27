package com.dbdesignassitant.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
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
public class ExerciseGenerationRequest {
    private String topic;

    @NotBlank
    private String difficulty;

    private String businessDomain;

    private String keywords;

    private Long baseExerciseId;

    private String additionalRequirements;
}
