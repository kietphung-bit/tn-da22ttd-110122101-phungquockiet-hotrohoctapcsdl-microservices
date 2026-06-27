package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.AdminPracticeInsightsResponse;
import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;

public interface PracticeInsightsService {
    AdminPracticeInsightsResponse getAdminPracticeInsights(
            String from,
            String to,
            SubmissionStatus status,
            SubmissionStatus roundStatus,
            ExerciseSource exerciseSource,
            Long exerciseId,
            Long studentId,
            String provider,
            Boolean fallbackUsed);

    InstructorExerciseInsightsResponse getInstructorExerciseInsights(
            Long currentInstructorId,
            Long exerciseId,
            String from,
            String to,
            SubmissionStatus submissionStatus,
            SubmissionStatus roundStatus,
            Integer roundNumber,
            String provider,
            Boolean fallbackUsed,
            PracticeInsightsScope scope);
}
