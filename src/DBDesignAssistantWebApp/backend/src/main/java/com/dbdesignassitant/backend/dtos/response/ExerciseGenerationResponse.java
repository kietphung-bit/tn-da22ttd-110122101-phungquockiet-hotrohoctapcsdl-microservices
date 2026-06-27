package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.ExerciseSource;
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
public class ExerciseGenerationResponse {
    private Long exerciseId;
    private String exerciseCode;
    private String title;
    private String description;
    private Map<String, Object> scenarioData;
    private ExerciseSource exerciseSource;
    private Long ownerStudentId;
    private Long baseExerciseId;
}
