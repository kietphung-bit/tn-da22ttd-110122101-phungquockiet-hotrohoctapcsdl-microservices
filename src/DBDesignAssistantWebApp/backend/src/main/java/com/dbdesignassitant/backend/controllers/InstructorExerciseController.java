package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.request.ExerciseRequest;
import com.dbdesignassitant.backend.dtos.request.ExerciseReviewRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.services.ExerciseService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor/exercises")
@RequiredArgsConstructor
public class InstructorExerciseController {
    private final ExerciseService exerciseService;
    private final com.dbdesignassitant.backend.repositories.UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        org.springframework.security.core.userdetails.UserDetails userDetails = 
                (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal();
        com.dbdesignassitant.backend.entities.User user = userRepository.findByUserEmailAndIsActiveTrue(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getUserId();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExerciseResponse>> createExercise(
            @Valid @RequestBody ExerciseRequest request) {
        Long currentUserId = getCurrentUserId();
        ExerciseResponse data = exerciseService.createInstructorExercise(currentUserId, request);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExerciseResponse>> updateExercise(
            @PathVariable Long id,
            @Valid @RequestBody ExerciseRequest request) {
        Long currentUserId = getCurrentUserId();
        ExerciseResponse data = exerciseService.updateInstructorExercise(currentUserId, id, request);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExerciseResponse>> getExerciseById(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        ExerciseResponse data = exerciseService.getInstructorExerciseById(currentUserId, id);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExerciseResponse>>> getAllExercises(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isPublished) {
        Long currentUserId = getCurrentUserId();
        List<ExerciseResponse> data = exerciseService.getInstructorExercises(currentUserId, search, isPublished);
        ApiResponse<List<ExerciseResponse>> response = ApiResponse.<List<ExerciseResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ExerciseGenerationResponse>> generateExercise(
            @Valid @RequestBody ExerciseGenerationRequest request) {
        Long currentUserId = getCurrentUserId();
        ExerciseGenerationResponse data = exerciseService.generateInstructorExercise(currentUserId, request);
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
        Long currentUserId = getCurrentUserId();
        boolean publish = request != null && Boolean.TRUE.equals(request.getPublish());
        ExerciseResponse data = exerciseService.approveInstructorGeneratedExercise(currentUserId, id, publish);
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
        Long currentUserId = getCurrentUserId();
        String reason = request == null ? null : request.getReason();
        ExerciseResponse data = exerciseService.rejectInstructorGeneratedExercise(currentUserId, id, reason);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<ExerciseResponse>> publishExercise(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        ExerciseResponse data = exerciseService.setInstructorExercisePublished(currentUserId, id, true);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/unpublish")
    public ResponseEntity<ApiResponse<ExerciseResponse>> unpublishExercise(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        ExerciseResponse data = exerciseService.setInstructorExercisePublished(currentUserId, id, false);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExercise(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        exerciseService.deleteInstructorExercise(currentUserId, id);
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(null)
                .build();
        return ResponseEntity.ok(response);
    }
}
