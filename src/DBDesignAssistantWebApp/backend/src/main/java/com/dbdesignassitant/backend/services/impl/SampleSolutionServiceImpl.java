package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.SampleSolutionRequest;
import com.dbdesignassitant.backend.dtos.response.SampleSolutionResponse;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.SampleSolution;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.mappers.ResponseMapper;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.SampleSolutionRepository;
import com.dbdesignassitant.backend.services.SampleSolutionService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SampleSolutionServiceImpl implements SampleSolutionService {
    private final SampleSolutionRepository sampleSolutionRepository;
    private final ExerciseRepository exerciseRepository;

    @Override
    public List<SampleSolutionResponse> getAllSampleSolutions() {
        return sampleSolutionRepository.findAll().stream()
                .map(ResponseMapper::toSampleSolutionResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SampleSolutionResponse getSampleSolutionById(Long sampleSolutionId) {
        SampleSolution sampleSolution = sampleSolutionRepository.findById(sampleSolutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        return ResponseMapper.toSampleSolutionResponse(sampleSolution);
    }

    @Override
    public SampleSolutionResponse getSampleSolutionByExerciseId(Long exerciseId) {
        SampleSolution sampleSolution = sampleSolutionRepository.findByExerciseExerciseId(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        return ResponseMapper.toSampleSolutionResponse(sampleSolution);
    }

    @Override
    public SampleSolutionResponse createSampleSolution(Long exerciseId, SampleSolutionRequest request) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (exercise.getExerciseSource() != ExerciseSource.MANUAL) {
            throw new BadRequestException("Sample solution is only allowed for MANUAL exercises");
        }
        if (sampleSolutionRepository.existsByExerciseExerciseId(exerciseId)) {
            throw new BadRequestException("Sample solution already exists for this exercise");
        }

        SampleSolution sampleSolution = SampleSolution.builder()
                .exercise(exercise)
                .solutionData(request.getSolutionData())
                .build();
        return ResponseMapper.toSampleSolutionResponse(sampleSolutionRepository.save(sampleSolution));
    }

    @Override
    public SampleSolutionResponse updateSampleSolution(Long sampleSolutionId, SampleSolutionRequest request) {
        SampleSolution sampleSolution = sampleSolutionRepository.findById(sampleSolutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        sampleSolution.setSolutionData(request.getSolutionData());
        return ResponseMapper.toSampleSolutionResponse(sampleSolutionRepository.save(sampleSolution));
    }

    @Override
    public void deleteSampleSolution(Long sampleSolutionId) {
        SampleSolution sampleSolution = sampleSolutionRepository.findById(sampleSolutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        sampleSolutionRepository.delete(sampleSolution);
    }

    // --- Instructor Methods ---

    private void verifyExerciseOwnership(Long currentUserId, Exercise exercise) {
        if (!exercise.getCreatedBy().getUserId().equals(currentUserId)) {
            throw new BadRequestException("You do not have permission to access sample solutions for this exercise");
        }
    }

    private void verifySampleSolutionOwnership(Long currentUserId, SampleSolution sampleSolution) {
        if (!sampleSolution.getExercise().getCreatedBy().getUserId().equals(currentUserId)) {
            throw new BadRequestException("You do not have permission to access this sample solution");
        }
    }

    @Override
    public SampleSolutionResponse getInstructorSampleSolutionByExerciseId(Long currentUserId, Long exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        verifyExerciseOwnership(currentUserId, exercise);

        SampleSolution sampleSolution = sampleSolutionRepository.findByExerciseExerciseId(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        return ResponseMapper.toSampleSolutionResponse(sampleSolution);
    }

    @Override
    public SampleSolutionResponse createInstructorSampleSolution(Long currentUserId, Long exerciseId, SampleSolutionRequest request) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        verifyExerciseOwnership(currentUserId, exercise);

        if (exercise.getExerciseSource() != ExerciseSource.MANUAL) {
            throw new BadRequestException("Sample solution is only allowed for MANUAL exercises");
        }
        if (sampleSolutionRepository.existsByExerciseExerciseId(exerciseId)) {
            throw new BadRequestException("Sample solution already exists for this exercise");
        }

        SampleSolution sampleSolution = SampleSolution.builder()
                .exercise(exercise)
                .solutionData(request.getSolutionData())
                .build();
        return ResponseMapper.toSampleSolutionResponse(sampleSolutionRepository.save(sampleSolution));
    }

    @Override
    public SampleSolutionResponse updateInstructorSampleSolution(Long currentUserId, Long sampleSolutionId, SampleSolutionRequest request) {
        SampleSolution sampleSolution = sampleSolutionRepository.findById(sampleSolutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        verifySampleSolutionOwnership(currentUserId, sampleSolution);

        sampleSolution.setSolutionData(request.getSolutionData());
        return ResponseMapper.toSampleSolutionResponse(sampleSolutionRepository.save(sampleSolution));
    }

    @Override
    public void deleteInstructorSampleSolution(Long currentUserId, Long sampleSolutionId) {
        SampleSolution sampleSolution = sampleSolutionRepository.findById(sampleSolutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample solution not found"));
        verifySampleSolutionOwnership(currentUserId, sampleSolution);

        sampleSolutionRepository.delete(sampleSolution);
    }
}
