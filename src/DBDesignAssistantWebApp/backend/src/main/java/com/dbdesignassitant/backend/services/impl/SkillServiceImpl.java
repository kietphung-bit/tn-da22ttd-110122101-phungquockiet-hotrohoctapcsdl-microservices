package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.SkillRequest;
import com.dbdesignassitant.backend.dtos.response.SkillResponse;
import com.dbdesignassitant.backend.entities.Skill;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.SkillRepository;
import com.dbdesignassitant.backend.services.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillServiceImpl implements SkillService {

    private final SkillRepository repository;

    @Override
    public List<SkillResponse> getAllSkills() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SkillResponse getSkillById(Long id) {
        Skill skill = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + id));
        return mapToResponse(skill);
    }

    @Override
    public SkillResponse createSkill(SkillRequest request) {
        Optional<Skill> existing = repository.findBySkillName(request.getSkillName());
        if (existing.isPresent()) {
            throw new BadRequestException("Skill name already exists");
        }

        Skill skill = Skill.builder()
                .skillName(request.getSkillName())
                .skillDescription(request.getSkillDescription())
                .skillCategory(request.getSkillCategory())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        return mapToResponse(repository.save(skill));
    }

    @Override
    public SkillResponse updateSkill(Long id, SkillRequest request) {
        Skill skill = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + id));

        if (!skill.getSkillName().equals(request.getSkillName())) {
            Optional<Skill> existing = repository.findBySkillName(request.getSkillName());
            if (existing.isPresent()) {
                throw new BadRequestException("Skill name already exists");
            }
        }

        skill.setSkillName(request.getSkillName());
        skill.setSkillDescription(request.getSkillDescription());
        skill.setSkillCategory(request.getSkillCategory());
        if (request.getIsActive() != null) {
            skill.setIsActive(request.getIsActive());
        }

        return mapToResponse(repository.save(skill));
    }

    @Override
    public void deleteSkill(Long id) {
        Skill skill = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + id));
        // Hard delete
        repository.delete(skill);
    }

    private SkillResponse mapToResponse(Skill skill) {
        return SkillResponse.builder()
                .skillId(skill.getSkillId())
                .skillName(skill.getSkillName())
                .skillDescription(skill.getSkillDescription())
                .skillCategory(skill.getSkillCategory())
                .isActive(skill.getIsActive())
                .build();
    }
}
