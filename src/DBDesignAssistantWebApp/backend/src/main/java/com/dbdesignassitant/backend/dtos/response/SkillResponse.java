package com.dbdesignassitant.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {
    private Long skillId;
    private String skillName;
    private String skillDescription;
    private String skillCategory;
    private Boolean isActive;
}
