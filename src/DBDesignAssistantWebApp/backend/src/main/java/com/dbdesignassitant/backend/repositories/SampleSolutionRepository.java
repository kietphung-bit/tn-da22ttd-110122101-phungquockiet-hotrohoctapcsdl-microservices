package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.SampleSolution;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SampleSolutionRepository extends JpaRepository<SampleSolution, Long> {
    Optional<SampleSolution> findByExerciseExerciseId(Long exerciseId);

    boolean existsByExerciseExerciseId(Long exerciseId);
}
