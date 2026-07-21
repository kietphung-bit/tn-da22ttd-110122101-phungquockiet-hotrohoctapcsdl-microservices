package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.ExerciseSource;
import java.time.LocalDateTime;
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
public class ExerciseResponse {
    private Long exerciseId;
    private String exTitle;
    private String exDescription;
    private Map<String, Object> scenarioData;
    private ExerciseSource exerciseSource;
    private String exerciseCode;
    private UserResponse createdBy;
    private UserResponse ownerStudent;
    private Long baseExerciseId;
    private String baseExerciseCode;
    private Boolean isPublished;
    private Boolean studentArchived;
    private LocalDateTime studentArchivedAt;
}
