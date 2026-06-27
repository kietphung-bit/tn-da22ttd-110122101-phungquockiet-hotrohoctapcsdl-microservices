package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.EvaluationJobPayload;

public interface EvaluationJobPublisher {
    void publish(EvaluationJobPayload payload);
}
