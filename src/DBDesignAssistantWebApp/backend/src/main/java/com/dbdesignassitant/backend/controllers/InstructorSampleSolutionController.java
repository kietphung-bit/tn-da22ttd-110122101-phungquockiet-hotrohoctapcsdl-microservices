package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.SampleSolutionRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.SampleSolutionResponse;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.services.SampleSolutionService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
public class InstructorSampleSolutionController {
    private final SampleSolutionService sampleSolutionService;
    private final com.dbdesignassitant.backend.repositories.UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        org.springframework.security.core.userdetails.UserDetails userDetails = 
                (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal();
        com.dbdesignassitant.backend.entities.User user = userRepository.findByUserEmailAndIsActiveTrue(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getUserId();
    }

    @GetMapping("/exercises/{exerciseId}/sample-solution")
    public ResponseEntity<ApiResponse<SampleSolutionResponse>> getSampleSolutionByExerciseId(
            @PathVariable Long exerciseId) {
        Long currentUserId = getCurrentUserId();
        SampleSolutionResponse data = sampleSolutionService.getInstructorSampleSolutionByExerciseId(currentUserId, exerciseId);
        ApiResponse<SampleSolutionResponse> response = ApiResponse.<SampleSolutionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/exercises/{exerciseId}/sample-solution")
    public ResponseEntity<ApiResponse<SampleSolutionResponse>> createSampleSolution(
            @PathVariable Long exerciseId,
            @Valid @RequestBody SampleSolutionRequest request) {
        Long currentUserId = getCurrentUserId();
        SampleSolutionResponse data = sampleSolutionService.createInstructorSampleSolution(currentUserId, exerciseId, request);
        ApiResponse<SampleSolutionResponse> response = ApiResponse.<SampleSolutionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/sample-solutions/{id}")
    public ResponseEntity<ApiResponse<SampleSolutionResponse>> updateSampleSolution(
            @PathVariable Long id,
            @Valid @RequestBody SampleSolutionRequest request) {
        Long currentUserId = getCurrentUserId();
        SampleSolutionResponse data = sampleSolutionService.updateInstructorSampleSolution(currentUserId, id, request);
        ApiResponse<SampleSolutionResponse> response = ApiResponse.<SampleSolutionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/sample-solutions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSampleSolution(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        sampleSolutionService.deleteInstructorSampleSolution(currentUserId, id);
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(null)
                .build();
        return ResponseEntity.ok(response);
    }
}
