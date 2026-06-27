package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.KnowledgeBaseRequest;
import com.dbdesignassitant.backend.dtos.request.ReviewKnowledgeRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.EmbeddingBatchResponse;
import com.dbdesignassitant.backend.dtos.response.KnowledgeBaseResponse;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.services.KnowledgeEmbeddingService;
import com.dbdesignassitant.backend.services.KnowledgeBaseService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knowledge-base")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;
    private final KnowledgeEmbeddingService knowledgeEmbeddingService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<ApiResponse<List<KnowledgeBaseResponse>>> getAllKnowledgeBases(
            @RequestParam(required = false) String status) {
        List<KnowledgeBaseResponse> data;
        if ("SUBMITTED".equalsIgnoreCase(status)) {
            data = service.getSubmittedKnowledge();
        } else {
            data = service.getAllKnowledgeBases();
        }
        return ResponseEntity.ok(ApiResponse.<List<KnowledgeBaseResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> getKnowledgeBaseById(@PathVariable Long id) {
        KnowledgeBaseResponse data = service.getKnowledgeBaseById(id);
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> createKnowledgeBase(
            @Valid @RequestBody KnowledgeBaseRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.createKnowledgeBase(request, userId, RoleName.ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.CREATED.value())
                .message("Created successfully")
                .data(data)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> updateKnowledgeBase(
            @PathVariable Long id, 
            @Valid @RequestBody KnowledgeBaseRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.updateKnowledgeBase(id, request, userId, RoleName.ADMIN);
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Updated successfully")
                .data(data)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteKnowledgeBase(
            @PathVariable Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        service.deleteKnowledgeBase(id, userId, RoleName.ADMIN);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Deleted successfully")
                .build());
    }

    @PostMapping("/embeddings/generate")
    public ResponseEntity<ApiResponse<EmbeddingBatchResponse>> generateEmbeddings(
            @RequestParam(defaultValue = "false") boolean regenerate) {
        EmbeddingBatchResponse data = knowledgeEmbeddingService.generateApprovedEmbeddings(regenerate);
        return ResponseEntity.ok(ApiResponse.<EmbeddingBatchResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Embeddings generated")
                .data(data)
                .build());
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> approveKnowledgeBase(
            @PathVariable Long id) {
        Long adminId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.approveKnowledgeBase(id, adminId);
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Approved successfully")
                .data(data)
                .build());
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> rejectKnowledgeBase(
            @PathVariable Long id,
            @Valid @RequestBody ReviewKnowledgeRequest request) {
        Long adminId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.rejectKnowledgeBase(id, adminId, request.getReviewNote());
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Rejected successfully")
                .data(data)
                .build());
    }
}
