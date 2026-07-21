package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.request.ExerciseReviewRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.services.ExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/exercises")
@RequiredArgsConstructor
public class AdminExerciseController {
    private final ExerciseService exerciseService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ExerciseGenerationResponse>> generateExercise(
            @Valid @RequestBody ExerciseGenerationRequest request) {
        ExerciseGenerationResponse data = exerciseService.generateAdminExercise(request);
        ApiResponse<ExerciseGenerationResponse> response = ApiResponse.<ExerciseGenerationResponse>builder()
                .status(HttpStatus.CREATED.value())
                .message("Exercise generated successfully")
                .data(data)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<ExerciseResponse>> approveGeneratedExercise(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ExerciseReviewRequest request) {
        boolean publish = request != null && Boolean.TRUE.equals(request.getPublish());
        ExerciseResponse data = exerciseService.approveAdminGeneratedExercise(id, publish);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<ExerciseResponse>> rejectGeneratedExercise(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ExerciseReviewRequest request) {
        String reason = request == null ? null : request.getReason();
        ExerciseResponse data = exerciseService.rejectAdminGeneratedExercise(id, reason);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }
}
