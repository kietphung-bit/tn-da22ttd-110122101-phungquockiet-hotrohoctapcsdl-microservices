package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.EvaluationJobPayload;
import com.dbdesignassitant.backend.services.EvaluationJobPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisEvaluationJobPublisher implements EvaluationJobPublisher {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${evaluation.redis.queue:evaluation:jobs}")
    private String queueName;

    @Override
    public void publish(EvaluationJobPayload payload) {
        try {
            String message = objectMapper.writeValueAsString(payload);
            stringRedisTemplate.opsForList().rightPush(queueName, message);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize evaluation job payload", ex);
        }
    }
}
