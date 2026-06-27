package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.SampleSolutionRequest;
import com.dbdesignassitant.backend.dtos.response.SampleSolutionResponse;
import java.util.List;

public interface SampleSolutionService {
    List<SampleSolutionResponse> getAllSampleSolutions();

    SampleSolutionResponse getSampleSolutionById(Long sampleSolutionId);

    SampleSolutionResponse getSampleSolutionByExerciseId(Long exerciseId);

    SampleSolutionResponse createSampleSolution(Long exerciseId, SampleSolutionRequest request);

    SampleSolutionResponse updateSampleSolution(Long sampleSolutionId, SampleSolutionRequest request);

    void deleteSampleSolution(Long sampleSolutionId);

    // Instructor methods
    SampleSolutionResponse getInstructorSampleSolutionByExerciseId(Long currentUserId, Long exerciseId);

    SampleSolutionResponse createInstructorSampleSolution(Long currentUserId, Long exerciseId, SampleSolutionRequest request);

    SampleSolutionResponse updateInstructorSampleSolution(Long currentUserId, Long sampleSolutionId, SampleSolutionRequest request);

    void deleteInstructorSampleSolution(Long currentUserId, Long sampleSolutionId);
}
