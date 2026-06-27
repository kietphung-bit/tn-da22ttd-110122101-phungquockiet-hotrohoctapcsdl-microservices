package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.repositories.EvaluationRoundRepository;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PracticeInsightsServiceImplTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private EvaluationRoundRepository evaluationRoundRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @InjectMocks
    private PracticeInsightsServiceImpl practiceInsightsService;

    @Test
    void instructorCanReadOwnExerciseInsights() {
        LocalDateTime submittedAt = LocalDateTime.of(2026, 6, 24, 9, 0);
        LocalDateTime gradedAt = LocalDateTime.of(2026, 6, 24, 9, 5);

        when(exerciseRepository.findCreatedByIdByExerciseId(100L))
                .thenReturn(Optional.of(7L));
        when(exerciseRepository.findPracticeInsightsExerciseHeader(100L))
                .thenReturn(Optional.of(new Object[] {
                        100L,
                        "MANUAL-100",
                        "Library ERD",
                        ExerciseSource.MANUAL,
                        true
                }));
        when(exerciseRepository.countDerivedAiExercises(100L)).thenReturn(1L);
        when(submissionRepository.findInstructorPracticeSubmissionSummary(
                eq(100L),
                eq("ALL"),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull()))
                .thenReturn(new Object[] {1L, 1L, 2L, 1L, 0L, 1L});
        when(evaluationRoundRepository.findInstructorPracticeRoundSummary(
                eq(100L),
                eq("ALL"),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull()))
                .thenReturn(new Object[] {3L, 2L, 0L, 1L, BigDecimal.valueOf(82), 1L});
        when(evaluationRoundRepository.findInstructorPracticeTopIssueTypes(
                eq(100L),
                eq("ALL"),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                eq(10)))
                .thenReturn(List.<Object[]>of(new Object[] {"MISSING_PK", 2L, 1L}));
        when(submissionRepository.findInstructorAnonymizedSubmissionSummaries(
                eq(100L),
                eq("ALL"),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                eq(20)))
                .thenReturn(List.<Object[]>of(new Object[] {
                        200L,
                        "DIRECT",
                        "GRADED",
                        2L,
                        "GRADED",
                        BigDecimal.valueOf(90),
                        submittedAt,
                        gradedAt
                }));

        InstructorExerciseInsightsResponse response = practiceInsightsService.getInstructorExerciseInsights(
                7L,
                100L,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                PracticeInsightsScope.ALL);

        assertEquals(100L, response.getExercise().getExerciseId());
        assertEquals("Library ERD", response.getExercise().getExerciseTitle());
        assertEquals(1L, response.getSummary().getDirectSubmissionCount());
        assertEquals(1L, response.getSummary().getDerivedSubmissionCount());
        assertEquals(2L, response.getSummary().getParticipantCount());
        assertEquals(3L, response.getSummary().getTotalRounds());
        assertEquals(0, BigDecimal.valueOf(0.3333).compareTo(response.getSummary().getFallbackRate()));
        assertEquals("MISSING_PK", response.getTopIssueTypes().get(0).getErrorType());
        assertEquals(200L, response.getAnonymizedSubmissionSummaries().get(0).getSubmissionId());
        assertEquals(PracticeInsightsScope.DIRECT,
                response.getAnonymizedSubmissionSummaries().get(0).getExerciseScope());
        assertEquals(SubmissionStatus.GRADED,
                response.getAnonymizedSubmissionSummaries().get(0).getLatestRoundStatus());
    }

    @Test
    void instructorCannotReadAnotherInstructorExerciseInsights() {
        when(exerciseRepository.findCreatedByIdByExerciseId(100L))
                .thenReturn(Optional.of(8L));

        assertThrows(
                BadRequestException.class,
                () -> practiceInsightsService.getInstructorExerciseInsights(
                        7L,
                        100L,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        PracticeInsightsScope.ALL));

        verify(exerciseRepository, never()).findPracticeInsightsExerciseHeader(100L);
        verifyNoInteractions(submissionRepository, evaluationRoundRepository);
    }
}
