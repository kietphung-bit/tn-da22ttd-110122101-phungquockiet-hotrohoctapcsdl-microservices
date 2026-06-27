package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.AIEvaluation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AIEvaluationRepository extends JpaRepository<AIEvaluation, Long> {
    Optional<AIEvaluation> findBySubmission_SubmissionId(Long submissionId);
}
