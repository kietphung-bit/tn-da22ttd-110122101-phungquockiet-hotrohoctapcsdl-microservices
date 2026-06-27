package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.StudentSkillStatsResponse;

import java.util.List;

public interface StudentSkillStatsService {
    List<StudentSkillStatsResponse> getAllStats();
    List<StudentSkillStatsResponse> getStatsByStudentId(Long studentId);
    List<StudentSkillStatsResponse> getStatsBySkillId(Long skillId);
    StudentSkillStatsResponse getStatById(Long id);
}
