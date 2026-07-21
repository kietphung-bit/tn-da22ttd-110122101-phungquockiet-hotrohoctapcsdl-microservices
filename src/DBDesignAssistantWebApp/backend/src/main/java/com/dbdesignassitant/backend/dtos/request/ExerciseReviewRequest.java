package com.dbdesignassitant.backend.dtos.request;

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
public class ExerciseReviewRequest {
    @Size(max = 1000)
    private String reason;

    @Builder.Default
    private Boolean publish = false;
}
