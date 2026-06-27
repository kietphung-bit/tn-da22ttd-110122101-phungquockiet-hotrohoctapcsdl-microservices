package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.Submission;
import java.util.List;

public interface MockEvaluationService {
    AIEvaluation evaluateAndPersist(Submission submission);

    List<EvaluationDetail> getDetails(Long evaluationId);
}
