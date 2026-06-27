package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.enums.AiProvider;

import java.util.List;

public interface EmbeddingClient {
    AiProvider provider();

    boolean isAvailable();

    String model();

    int dimension();

    List<Double> embed(String text);
}
