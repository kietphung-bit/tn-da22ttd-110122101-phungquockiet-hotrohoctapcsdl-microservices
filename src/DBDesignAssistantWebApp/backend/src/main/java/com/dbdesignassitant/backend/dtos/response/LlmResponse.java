package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.AiProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmResponse {
    private String answer;
    private AiProvider provider;
    private String model;
}
