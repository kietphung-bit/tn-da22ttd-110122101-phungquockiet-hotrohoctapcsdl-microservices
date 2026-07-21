package com.dbdesignassitant.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(max = 4000)
    private String customPrompt;

    private String topic;

    @NotBlank
    private String difficulty;

    private String businessDomain;

    @Size(max = 4000)
    private String businessContext;

    private String keywords;

    private Long baseExerciseId;

    private String additionalRequirements;
}
