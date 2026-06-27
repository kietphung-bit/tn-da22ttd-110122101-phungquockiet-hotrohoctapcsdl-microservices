package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.ExerciseRequest;
import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import java.util.List;

public interface ExerciseService {
    ExerciseResponse createExercise(ExerciseRequest request);

    ExerciseResponse updateExercise(Long exerciseId, ExerciseRequest request);

    ExerciseResponse getExerciseById(Long exerciseId);

    List<ExerciseResponse> getAllExercises();

    List<ExerciseResponse> getExercises(String search, ExerciseSource source, Boolean isPublished);

    void deleteExercise(Long exerciseId);

    ExerciseResponse setExercisePublished(Long exerciseId, boolean isPublished);

    // Student methods
    List<ExerciseResponse> getStudentExercises(String search);

    ExerciseResponse getStudentExerciseById(Long exerciseId);

    ExerciseGenerationResponse generateStudentExercise(ExerciseGenerationRequest request);

    // Instructor methods
    List<ExerciseResponse> getInstructorExercises(Long currentUserId, String search, Boolean isPublished);

    ExerciseResponse getInstructorExerciseById(Long currentUserId, Long exerciseId);

    ExerciseResponse createInstructorExercise(Long currentUserId, ExerciseRequest request);

    ExerciseResponse updateInstructorExercise(Long currentUserId, Long exerciseId, ExerciseRequest request);

    void deleteInstructorExercise(Long currentUserId, Long exerciseId);

    ExerciseResponse setInstructorExercisePublished(Long currentUserId, Long exerciseId, boolean isPublished);
}
