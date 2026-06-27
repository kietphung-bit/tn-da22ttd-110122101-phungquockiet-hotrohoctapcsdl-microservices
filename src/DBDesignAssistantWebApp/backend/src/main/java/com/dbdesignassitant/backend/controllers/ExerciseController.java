package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.ExerciseRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.services.ExerciseService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {
    private final ExerciseService exerciseService;

    @PostMapping
    public ResponseEntity<ApiResponse<ExerciseResponse>> createExercise(
            @Valid @RequestBody ExerciseRequest request) {
        ExerciseResponse data = exerciseService.createExercise(request);
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
        ExerciseResponse data = exerciseService.updateExercise(id, request);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExerciseResponse>> getExerciseById(@PathVariable Long id) {
        ExerciseResponse data = exerciseService.getExerciseById(id);
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
            @RequestParam(required = false) ExerciseSource exerciseSource,
            @RequestParam(required = false) Boolean isPublished) {
        List<ExerciseResponse> data = exerciseService.getExercises(search, exerciseSource, isPublished);
        ApiResponse<List<ExerciseResponse>> response = ApiResponse.<List<ExerciseResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<ExerciseResponse>> publishExercise(@PathVariable Long id) {
        ExerciseResponse data = exerciseService.setExercisePublished(id, true);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/unpublish")
    public ResponseEntity<ApiResponse<ExerciseResponse>> unpublishExercise(@PathVariable Long id) {
        ExerciseResponse data = exerciseService.setExercisePublished(id, false);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExercise(@PathVariable Long id) {
        exerciseService.deleteExercise(id);
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(null)
                .build();
        return ResponseEntity.ok(response);
    }
}
