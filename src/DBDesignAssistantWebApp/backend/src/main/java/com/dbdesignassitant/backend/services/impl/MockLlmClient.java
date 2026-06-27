package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.LlmClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class MockLlmClient implements LlmClient {
    @Override
    public AiProvider provider() {
        return AiProvider.MOCK;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public String model() {
        return "mock-rag-deterministic";
    }

    @Override
    public LlmResponse generate(String prompt, List<RetrievedKnowledgeResponse> context) {
        String answer;
        if (context == null || context.isEmpty()) {
            answer = "Chua tim thay tai lieu lien quan trong kho kien thuc da duyet. Ban co the hoi lai bang tu khoa cu the hon ve ERD, cardinality, chuan hoa hoac khoa.";
        } else {
            String sourceTitles = context.stream()
                    .map(RetrievedKnowledgeResponse::getKbTitle)
                    .collect(Collectors.joining(", "));
            String firstSnippet = context.get(0).getSnippet();
            answer = "Theo cac tai lieu da duyet (" + sourceTitles + "), y chinh la: "
                    + firstSnippet
                    + " Hay xem day la goi y hoc tap ngan gon, khong phai loi giai hoan chinh cho bai thiet ke.";
        }

        return LlmResponse.builder()
                .answer(answer)
                .provider(provider())
                .model(model())
                .build();
    }
}
