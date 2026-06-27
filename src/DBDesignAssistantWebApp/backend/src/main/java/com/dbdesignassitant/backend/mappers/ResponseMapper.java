package com.dbdesignassitant.backend.mappers;

import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.dtos.response.RoleResponse;
import com.dbdesignassitant.backend.dtos.response.SampleSolutionResponse;
import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.SampleSolution;
import com.dbdesignassitant.backend.entities.User;

public final class ResponseMapper {
    private ResponseMapper() {}

    public static RoleResponse toRoleResponse(Role role) {
        if (role == null) {
            return null;
        }
        return RoleResponse.builder()
                .roleId(role.getRoleId())
                .roleName(role.getRoleName())
                .build();
    }

    public static UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .userId(user.getUserId())
                .userEmail(user.getUserEmail())
                .fullName(user.getFullName())
                .userGender(user.getUserGender())
                .userDob(user.getUserDob())
                .userPhone(user.getUserPhone())
                .userAddress(user.getUserAddress())
                .role(toRoleResponse(user.getRole()))
                .isActive(user.getIsActive())
                .build();
    }

    public static ExerciseResponse toExerciseResponse(Exercise exercise) {
        if (exercise == null) {
            return null;
        }
        return ExerciseResponse.builder()
                .exerciseId(exercise.getExerciseId())
                .exTitle(exercise.getExTitle())
                .exDescription(exercise.getExDescription())
                .scenarioData(exercise.getScenarioData())
                .exerciseSource(exercise.getExerciseSource())
                .exerciseCode(exercise.getExerciseCode())
                .createdBy(toUserResponse(exercise.getCreatedBy()))
                .ownerStudent(toUserResponse(exercise.getOwnerStudent()))
                .baseExerciseId(exercise.getBaseExercise() == null ? null : exercise.getBaseExercise().getExerciseId())
                .baseExerciseCode(exercise.getBaseExercise() == null ? null : exercise.getBaseExercise().getExerciseCode())
                .isPublished(exercise.getIsPublished())
                .build();
    }

    public static SampleSolutionResponse toSampleSolutionResponse(SampleSolution sampleSolution) {
        if (sampleSolution == null) {
            return null;
        }
        Exercise exercise = sampleSolution.getExercise();
        return SampleSolutionResponse.builder()
                .sampleSolutionId(sampleSolution.getSampleSolutionId())
                .exerciseId(exercise == null ? null : exercise.getExerciseId())
                .exerciseCode(exercise == null ? null : exercise.getExerciseCode())
                .solutionData(sampleSolution.getSolutionData())
                .build();
    }
}
