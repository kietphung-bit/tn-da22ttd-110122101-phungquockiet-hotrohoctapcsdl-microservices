package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.StudentSkillStatsResponse;
import com.dbdesignassitant.backend.entities.StudentSkillStats;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.StudentSkillStatsRepository;
import com.dbdesignassitant.backend.services.StudentSkillStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentSkillStatsServiceImpl implements StudentSkillStatsService {

    private final StudentSkillStatsRepository repository;

    @Override
    public List<StudentSkillStatsResponse> getAllStats() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<StudentSkillStatsResponse> getStatsByStudentId(Long studentId) {
        return repository.findByStudent_UserId(studentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<StudentSkillStatsResponse> getStatsBySkillId(Long skillId) {
        return repository.findBySkill_SkillId(skillId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StudentSkillStatsResponse getStatById(Long id) {
        StudentSkillStats stats = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stats not found with id: " + id));
        return mapToResponse(stats);
    }

    private StudentSkillStatsResponse mapToResponse(StudentSkillStats stats) {
        return StudentSkillStatsResponse.builder()
                .statsId(stats.getStatsId())
                .studentId(stats.getStudent().getUserId())
                .studentName(stats.getStudent().getFullName())
                .skillId(stats.getSkill().getSkillId())
                .skillName(stats.getSkill().getSkillName())
                .proficiencyLevel(stats.getProficiencyLevel())
                .attemptCount(stats.getAttemptCount())
                .lastEvaluatedAt(stats.getLastEvaluatedAt())
                .build();
    }
}
