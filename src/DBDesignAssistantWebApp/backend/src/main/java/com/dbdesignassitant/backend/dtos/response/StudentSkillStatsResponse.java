package com.dbdesignassitant.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSkillStatsResponse {
    private Long statsId;
    private Long studentId;
    private String studentName;
    private Long skillId;
    private String skillName;
    private Double proficiencyLevel;
    private Integer attemptCount;
    private LocalDateTime lastEvaluatedAt;
}
