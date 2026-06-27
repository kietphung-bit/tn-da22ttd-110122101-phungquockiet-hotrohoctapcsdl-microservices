package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;

public interface KnowledgeRetrievalService {
    KnowledgeRetrievalResult retrieveTopK(String question, int topK);
}
