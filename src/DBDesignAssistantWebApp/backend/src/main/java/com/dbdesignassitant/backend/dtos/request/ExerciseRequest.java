package com.dbdesignassitant.backend.dtos.request;

import com.dbdesignassitant.backend.enums.ExerciseSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ExerciseRequest {
    @NotBlank
    private String exTitle;

    private String exDescription;

    @NotNull
    private Map<String, Object> scenarioData;

    private ExerciseSource exerciseSource;

    private String exerciseCode;

    private Long ownerStudentId;

    private Long baseExerciseId;

    @NotNull
    private Long createdById;

    @NotNull
    private Boolean isPublished;
}
