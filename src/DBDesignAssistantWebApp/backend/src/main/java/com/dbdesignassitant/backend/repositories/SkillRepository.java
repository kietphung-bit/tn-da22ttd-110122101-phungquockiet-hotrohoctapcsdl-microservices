package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, Long> {
    List<Skill> findByIsActiveTrue();
    Optional<Skill> findBySkillName(String skillName);
}
