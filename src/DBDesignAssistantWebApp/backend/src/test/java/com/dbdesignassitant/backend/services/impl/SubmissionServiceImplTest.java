package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.AIEvaluationResponse;
import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.EvaluationRound;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.AIEvaluationRepository;
import com.dbdesignassitant.backend.repositories.EvaluationRoundRepository;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.EvaluationJobPublisher;
import com.dbdesignassitant.backend.services.MockEvaluationService;
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
class SubmissionServiceImplTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private AIEvaluationRepository aiEvaluationRepository;

    @Mock
    private EvaluationRoundRepository evaluationRoundRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MockEvaluationService mockEvaluationService;

    @Mock
    private EvaluationJobPublisher evaluationJobPublisher;

    @InjectMocks
    private SubmissionServiceImpl submissionService;

    @Test
    void getStudentEvaluationRoundsRejectsNonOwnerBeforeLoadingRounds() {
        when(submissionRepository.findBySubmissionIdAndUser_UserId(10L, 2L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> submissionService.getStudentEvaluationRounds(2L, 10L));

        verify(evaluationRoundRepository, never()).findAllBySubmission_SubmissionIdOrderByRoundNumberAsc(anyLong());
    }

    @Test
    void studentEvaluationUsesLatestGradedRoundWhenCurrentRoundIsProcessing() {
        Submission submission = submission(10L, 1L, SubmissionStatus.PROCESSING);
        AIEvaluation evaluation = AIEvaluation.builder()
                .evaluationId(55L)
                .submission(submission)
                .overallScore(BigDecimal.valueOf(82))
                .evaluatedAt(LocalDateTime.now())
                .provider("MOCK")
                .model("mock-rule-based")
                .fallbackUsed(false)
                .build();
        EvaluationRound roundOne = round(101L, submission, 1, SubmissionStatus.GRADED);

        when(submissionRepository.findBySubmissionIdAndUser_UserId(10L, 1L))
                .thenReturn(Optional.of(submission));
        when(aiEvaluationRepository.findBySubmission_SubmissionId(10L))
                .thenReturn(Optional.of(evaluation));
        when(evaluationRoundRepository.findTopBySubmission_SubmissionIdAndRoundStatusOrderByRoundNumberDesc(
                10L,
                SubmissionStatus.GRADED))
                .thenReturn(Optional.of(roundOne));
        when(evaluationRoundRepository.countBySubmission_SubmissionId(10L))
                .thenReturn(2L);
        when(mockEvaluationService.getDetails(55L))
                .thenReturn(List.of(EvaluationDetail.builder()
                        .detailId(501L)
                        .aiEvaluation(evaluation)
                        .errorType("MISSING_CARDINALITY")
                        .evaDescription("Check cardinality.")
                        .errorLocation("Relationship: borrows")
                        .build()));

        AIEvaluationResponse response = submissionService.getStudentEvaluationBySubmissionId(1L, 10L);

        assertEquals(101L, response.getRoundId());
        assertEquals(1, response.getRoundNumber());
        assertEquals(2, response.getRoundsUsed());
        assertEquals("MOCK", response.getProvider());
    }

    @Test
    void getAdminEvaluationRoundsReturnsProviderMetadataWithoutDetails() {
        Submission submission = submission(10L, 1L, SubmissionStatus.FAILED);
        EvaluationRound failedRound = EvaluationRound.builder()
                .roundId(102L)
                .submission(submission)
                .roundNumber(2)
                .roundStatus(SubmissionStatus.FAILED)
                .overallScore(null)
                .provider("MOCK")
                .model("mock-rule-based")
                .fallbackUsed(true)
                .fallbackFrom("GEMINI")
                .submittedAt(LocalDateTime.now())
                .gradedAt(null)
                .build();

        when(evaluationRoundRepository.findAdminMonitoringRoundsByProvider(
                eq(SubmissionStatus.FAILED),
                eq("MOCK"),
                eq(true),
                eq(10L),
                eq(1L)))
                .thenReturn(List.of(failedRound));

        List<AdminEvaluationRoundResponse> response = submissionService.getAdminEvaluationRounds(
                SubmissionStatus.FAILED,
                " MOCK ",
                true,
                10L,
                1L);

        assertEquals(1, response.size());
        assertEquals(102L, response.get(0).getRoundId());
        assertEquals(10L, response.get(0).getSubmissionId());
        assertEquals(1L, response.get(0).getStudentId());
        assertEquals(2, response.get(0).getRoundNumber());
        assertEquals(SubmissionStatus.FAILED, response.get(0).getRoundStatus());
        assertEquals("MOCK", response.get(0).getProvider());
        assertEquals("GEMINI", response.get(0).getFallbackFrom());
        verify(evaluationRoundRepository).findAdminMonitoringRoundsByProvider(
                SubmissionStatus.FAILED,
                "MOCK",
                true,
                10L,
                1L);
    }

    @Test
    void getAdminEvaluationRoundsWithoutProviderUsesNonProviderQuery() {
        Submission submission = submission(10L, 1L, SubmissionStatus.FAILED);
        EvaluationRound failedRound = EvaluationRound.builder()
                .roundId(103L)
                .submission(submission)
                .roundNumber(2)
                .roundStatus(SubmissionStatus.FAILED)
                .overallScore(null)
                .provider("MOCK")
                .model("mock-rule-based")
                .fallbackUsed(true)
                .fallbackFrom("GEMINI")
                .submittedAt(LocalDateTime.now())
                .gradedAt(null)
                .build();

        when(evaluationRoundRepository.findAdminMonitoringRounds(
                eq(SubmissionStatus.FAILED),
                eq(true),
                eq(10L),
                eq(1L)))
                .thenReturn(List.of(failedRound));

        List<AdminEvaluationRoundResponse> response = submissionService.getAdminEvaluationRounds(
                SubmissionStatus.FAILED,
                "   ",
                true,
                10L,
                1L);

        assertEquals(1, response.size());
        assertEquals(103L, response.get(0).getRoundId());
        verify(evaluationRoundRepository).findAdminMonitoringRounds(
                SubmissionStatus.FAILED,
                true,
                10L,
                1L);
        verify(evaluationRoundRepository, never()).findAdminMonitoringRoundsByProvider(
                any(),
                any(),
                any(),
                any(),
                any());
    }

    private Submission submission(Long submissionId, Long userId, SubmissionStatus status) {
        User user = User.builder()
                .userId(userId)
                .userEmail("student" + userId + "@dbdesign.local")
                .fullName("Student " + userId)
                .passwordHash("hash")
                .build();
        Exercise exercise = Exercise.builder()
                .exerciseId(20L)
                .exTitle("Library ERD")
                .isPublished(true)
                .createdBy(user)
                .build();
        return Submission.builder()
                .submissionId(submissionId)
                .user(user)
                .exercise(exercise)
                .submissionStatus(status)
                .build();
    }

    private EvaluationRound round(Long roundId, Submission submission, int number, SubmissionStatus status) {
        return EvaluationRound.builder()
                .roundId(roundId)
                .submission(submission)
                .roundNumber(number)
                .roundStatus(status)
                .overallScore(BigDecimal.valueOf(82))
                .provider("MOCK")
                .model("mock-rule-based")
                .fallbackUsed(false)
                .submittedAt(LocalDateTime.now())
                .gradedAt(LocalDateTime.now())
                .build();
    }
}
