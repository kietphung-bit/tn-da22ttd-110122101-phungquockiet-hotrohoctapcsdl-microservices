package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.EvaluationDetail;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationDetailRepository extends JpaRepository<EvaluationDetail, Long> {
    List<EvaluationDetail> findByAiEvaluation_EvaluationId(Long evaluationId);
    void deleteByAiEvaluation_EvaluationId(Long evaluationId);
}
