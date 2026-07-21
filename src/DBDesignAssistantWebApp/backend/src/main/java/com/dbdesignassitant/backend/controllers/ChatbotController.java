package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.ChatRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.ChatConversationDetailResponse;
import com.dbdesignassitant.backend.dtos.response.ChatConversationSummaryResponse;
import com.dbdesignassitant.backend.dtos.response.ChatResponse;
import com.dbdesignassitant.backend.services.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    private final ChatbotService chatbotService;

    @PostMapping("/rag")
    public ResponseEntity<ApiResponse<ChatResponse>> askRag(@Valid @RequestBody ChatRequest request) {
        ChatResponse data = chatbotService.ask(request);
        return ResponseEntity.ok(ApiResponse.<ChatResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ChatConversationSummaryResponse>>> listConversations(
            @RequestParam(defaultValue = "false") boolean archived) {
        List<ChatConversationSummaryResponse> data = chatbotService.listConversations(archived);
        return ResponseEntity.ok(ApiResponse.<List<ChatConversationSummaryResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<ChatConversationDetailResponse>> getConversation(
            @PathVariable String conversationId) {
        ChatConversationDetailResponse data = chatbotService.getConversation(conversationId);
        return ResponseEntity.ok(ApiResponse.<ChatConversationDetailResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @PutMapping("/conversations/{conversationId}/archive")
    public ResponseEntity<ApiResponse<ChatConversationSummaryResponse>> archiveConversation(
            @PathVariable String conversationId) {
        ChatConversationSummaryResponse data = chatbotService.setConversationArchived(conversationId, true);
        return ResponseEntity.ok(ApiResponse.<ChatConversationSummaryResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @PutMapping("/conversations/{conversationId}/restore")
    public ResponseEntity<ApiResponse<ChatConversationSummaryResponse>> restoreConversation(
            @PathVariable String conversationId) {
        ChatConversationSummaryResponse data = chatbotService.setConversationArchived(conversationId, false);
        return ResponseEntity.ok(ApiResponse.<ChatConversationSummaryResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
