package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.StudentSkillStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentSkillStatsRepository extends JpaRepository<StudentSkillStats, Long> {
    List<StudentSkillStats> findByStudent_UserId(Long studentId);
    List<StudentSkillStats> findBySkill_SkillId(Long skillId);
    Optional<StudentSkillStats> findByStudent_UserIdAndSkill_SkillId(Long studentId, Long skillId);
}
