package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.SkillRequest;
import com.dbdesignassitant.backend.dtos.response.SkillResponse;

import java.util.List;

public interface SkillService {
    List<SkillResponse> getAllSkills();
    SkillResponse getSkillById(Long id);
    SkillResponse createSkill(SkillRequest request);
    SkillResponse updateSkill(Long id, SkillRequest request);
    void deleteSkill(Long id);
}
