package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.services.ExerciseService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/exercises")
@RequiredArgsConstructor
public class StudentExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExerciseResponse>>> getStudentExercises(
            @RequestParam(required = false) String search) {
        List<ExerciseResponse> data = exerciseService.getStudentExercises(search);
        ApiResponse<List<ExerciseResponse>> response = ApiResponse.<List<ExerciseResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExerciseResponse>> getStudentExerciseById(@PathVariable Long id) {
        ExerciseResponse data = exerciseService.getStudentExerciseById(id);
        ApiResponse<ExerciseResponse> response = ApiResponse.<ExerciseResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ExerciseGenerationResponse>> generateStudentExercise(
            @Valid @RequestBody ExerciseGenerationRequest request) {
        ExerciseGenerationResponse data = exerciseService.generateStudentExercise(request);
        ApiResponse<ExerciseGenerationResponse> response = ApiResponse.<ExerciseGenerationResponse>builder()
                .status(HttpStatus.CREATED.value())
                .message("Exercise generated successfully")
                .data(data)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
