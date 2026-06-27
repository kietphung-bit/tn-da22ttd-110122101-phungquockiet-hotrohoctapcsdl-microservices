package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.KnowledgeBaseRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.KnowledgeBaseResponse;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.services.KnowledgeBaseService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/knowledge-base")
@RequiredArgsConstructor
public class InstructorKnowledgeBaseController {

    private final KnowledgeBaseService service;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<KnowledgeBaseResponse>>> getMyKnowledgeBases() {
        Long instructorId = currentUserProvider.getCurrentUserId();
        List<KnowledgeBaseResponse> data = service.getKnowledgeBaseByInstructor(instructorId);
        return ResponseEntity.ok(ApiResponse.<List<KnowledgeBaseResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/system")
    public ResponseEntity<ApiResponse<List<KnowledgeBaseResponse>>> getSystemKnowledgeBases() {
        List<KnowledgeBaseResponse> data = service.getApprovedSystemKnowledge();
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
        Long instructorId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.createKnowledgeBase(request, instructorId, RoleName.INSTRUCTOR);
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
        Long instructorId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.updateKnowledgeBase(id, request, instructorId, RoleName.INSTRUCTOR);
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Updated successfully")
                .data(data)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteKnowledgeBase(
            @PathVariable Long id) {
        Long instructorId = currentUserProvider.getCurrentUserId();
        service.deleteKnowledgeBase(id, instructorId, RoleName.INSTRUCTOR);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Deleted successfully")
                .build());
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<KnowledgeBaseResponse>> submitKnowledgeBase(
            @PathVariable Long id) {
        Long instructorId = currentUserProvider.getCurrentUserId();
        KnowledgeBaseResponse data = service.submitKnowledgeBase(id, instructorId);
        return ResponseEntity.ok(ApiResponse.<KnowledgeBaseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Submitted successfully")
                .data(data)
                .build());
    }
}
