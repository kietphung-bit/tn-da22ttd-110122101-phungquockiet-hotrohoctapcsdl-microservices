package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.SampleSolutionRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.SampleSolutionResponse;
import com.dbdesignassitant.backend.services.SampleSolutionService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SampleSolutionController {
    private final SampleSolutionService sampleSolutionService;

    @GetMapping("/sample-solutions")
    public ResponseEntity<ApiResponse<List<SampleSolutionResponse>>> getAllSampleSolutions() {
        List<SampleSolutionResponse> data = sampleSolutionService.getAllSampleSolutions();
        ApiResponse<List<SampleSolutionResponse>> response = ApiResponse.<List<SampleSolutionResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sample-solutions/{id}")
    public ResponseEntity<ApiResponse<SampleSolutionResponse>> getSampleSolutionById(@PathVariable Long id) {
        SampleSolutionResponse data = sampleSolutionService.getSampleSolutionById(id);
        ApiResponse<SampleSolutionResponse> response = ApiResponse.<SampleSolutionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/exercises/{exerciseId}/sample-solution")
    public ResponseEntity<ApiResponse<SampleSolutionResponse>> getSampleSolutionByExerciseId(
            @PathVariable Long exerciseId) {
        SampleSolutionResponse data = sampleSolutionService.getSampleSolutionByExerciseId(exerciseId);
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
        SampleSolutionResponse data = sampleSolutionService.createSampleSolution(exerciseId, request);
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
        SampleSolutionResponse data = sampleSolutionService.updateSampleSolution(id, request);
        ApiResponse<SampleSolutionResponse> response = ApiResponse.<SampleSolutionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/sample-solutions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSampleSolution(@PathVariable Long id) {
        sampleSolutionService.deleteSampleSolution(id);
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(null)
                .build();
        return ResponseEntity.ok(response);
    }
}
