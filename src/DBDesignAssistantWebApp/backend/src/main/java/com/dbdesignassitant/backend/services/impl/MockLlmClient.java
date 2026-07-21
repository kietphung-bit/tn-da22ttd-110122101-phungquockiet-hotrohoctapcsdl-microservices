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
            answer = "Chưa tìm thấy tài liệu phù hợp trong kho học liệu đã duyệt. Bạn có thể hỏi lại bằng từ khóa cụ thể hơn về ERD, cardinality, chuẩn hóa hoặc khóa.";
        } else {
            String sourceTitles = context.stream()
                    .map(RetrievedKnowledgeResponse::getKbTitle)
                    .collect(Collectors.joining(", "));
            String firstSnippet = context.get(0).getSnippet();
            answer = "Dựa trên học liệu hiện có (" + sourceTitles + "), ý chính là: "
                    + firstSnippet
                    + "\n\nBạn nên xem đây là gợi ý để tự kiểm tra bài làm, không phải đáp án hoàn chỉnh.";
        }

        return LlmResponse.builder()
                .answer(answer)
                .provider(provider())
                .model(model())
                .build();
    }
}
