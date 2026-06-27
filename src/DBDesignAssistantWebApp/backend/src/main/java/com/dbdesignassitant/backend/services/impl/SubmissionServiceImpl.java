package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.response.AIEvaluationResponse;
import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.EvaluationDetailResponse;
import com.dbdesignassitant.backend.dtos.response.EvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionStatusResponse;
import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.EvaluationRound;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.AIEvaluationRepository;
import com.dbdesignassitant.backend.repositories.EvaluationRoundRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import com.dbdesignassitant.backend.dtos.request.EvaluationJobPayload;
import com.dbdesignassitant.backend.services.EvaluationJobPublisher;
import com.dbdesignassitant.backend.services.MockEvaluationService;
import com.dbdesignassitant.backend.services.SubmissionService;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.dtos.request.SubmissionRequest;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubmissionServiceImpl implements SubmissionService {
    private static final int MAX_EVALUATION_ROUNDS = 3;

    private final SubmissionRepository submissionRepository;
    private final AIEvaluationRepository aiEvaluationRepository;
    private final EvaluationRoundRepository evaluationRoundRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;
    private final MockEvaluationService mockEvaluationService;
    private final EvaluationJobPublisher evaluationJobPublisher;

    @Value("${evaluation.async.enabled:true}")
    private boolean evaluationAsyncEnabled;

    @Override
    public List<SubmissionResponse> getSubmissions(SubmissionStatus status, Long exerciseId, Long userId) {
        List<Submission> submissions;

        if (status != null && exerciseId != null && userId != null) {
            submissions = submissionRepository
                    .findBySubmissionStatusAndExercise_ExerciseIdAndUser_UserId(status, exerciseId, userId);
        } else if (status != null && exerciseId != null) {
            submissions = submissionRepository
                    .findBySubmissionStatusAndExercise_ExerciseId(status, exerciseId);
        } else if (status != null && userId != null) {
            submissions = submissionRepository
                    .findBySubmissionStatusAndUser_UserId(status, userId);
        } else if (exerciseId != null && userId != null) {
            submissions = submissionRepository
                    .findByExercise_ExerciseIdAndUser_UserId(exerciseId, userId);
        } else if (status != null) {
            submissions = submissionRepository.findBySubmissionStatus(status);
        } else if (exerciseId != null) {
            submissions = submissionRepository.findByExercise_ExerciseId(exerciseId);
        } else if (userId != null) {
            submissions = submissionRepository.findByUser_UserId(userId);
        } else {
            submissions = submissionRepository.findAll();
        }

        return submissions.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SubmissionResponse getSubmissionById(Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + id));

        SubmissionResponse response = toSummaryResponse(submission);

        // Include evaluation if available
        attachEvaluationData(response, id, true);

        return response;
    }

    @Override
    public AIEvaluationResponse getEvaluationBySubmissionId(Long submissionId) {
        // Verify submission exists
        if (!submissionRepository.existsById(submissionId)) {
            throw new ResourceNotFoundException("Submission not found with id: " + submissionId);
        }
        AIEvaluation evaluation = aiEvaluationRepository.findBySubmission_SubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No evaluation found for submission id: " + submissionId));
        return toEvaluationResponse(evaluation, latestGradedRound(submissionId).orElse(null), true);
    }

    @Override
    public List<AdminEvaluationRoundResponse> getAdminEvaluationRounds(
            SubmissionStatus status,
            String provider,
            Boolean fallbackUsed,
            Long submissionId,
            Long studentId) {
        String normalizedProvider = provider == null || provider.isBlank()
                ? null
                : provider.trim().toUpperCase(Locale.ROOT);
        List<EvaluationRound> rounds = normalizedProvider == null
                ? evaluationRoundRepository.findAdminMonitoringRounds(
                        status,
                        fallbackUsed,
                        submissionId,
                        studentId)
                : evaluationRoundRepository.findAdminMonitoringRoundsByProvider(
                        status,
                        normalizedProvider,
                        fallbackUsed,
                        submissionId,
                        studentId);

        return rounds
                .stream()
                .map(this::toAdminRoundResponse)
                .collect(Collectors.toList());
    }

    // ----------------------------- Student Methods -----------------------------

    @Override
    @Transactional
    public SubmissionResponse createDraft(Long userId, Long exerciseId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));

        if (!isExerciseAvailableForStudent(exercise, userId)) {
            throw new BadRequestException("Exercise is not available");
        }

        Submission submission = Submission.builder()
                .user(user)
                .exercise(exercise)
                .diagramData(new HashMap<>())
                .submissionStatus(SubmissionStatus.DRAFT)
                .build();

        return toSummaryResponse(submissionRepository.save(submission));
    }

    @Override
    @Transactional
    public SubmissionResponse updateDraft(Long userId, Long submissionId, SubmissionRequest request) {
        Submission submission = submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        if (submission.getSubmissionStatus() != SubmissionStatus.DRAFT) {
            if (!canResubmit(submission)) {
                throw new BadRequestException("No feedback rounds remaining for this submission");
            }
            if (submission.getSubmissionStatus() != SubmissionStatus.GRADED
                    && submission.getSubmissionStatus() != SubmissionStatus.FAILED) {
                throw new BadRequestException("Only DRAFT submissions can be updated");
            }
            submission.setSubmissionStatus(SubmissionStatus.DRAFT);
        }

        submission.setDiagramData(request.getDiagramData());
        return toSummaryResponse(submissionRepository.save(submission));
    }

    @Override
    @Transactional
    public SubmissionResponse submit(Long userId, Long submissionId, SubmissionRequest request) {
        Submission submission = submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        if (submission.getSubmissionStatus() != SubmissionStatus.DRAFT) {
            throw new BadRequestException("Submission is already submitted");
        }

        int nextRoundNumber = nextRoundNumber(submission.getSubmissionId());
        if (nextRoundNumber > MAX_EVALUATION_ROUNDS) {
            throw new BadRequestException("Maximum feedback rounds reached");
        }

        if (request != null && request.getDiagramData() != null) {
            submission.setDiagramData(request.getDiagramData());
        }

        submission.setSubmittedAt(LocalDateTime.now());
        submission.setSubmissionStatus(SubmissionStatus.PROCESSING);
        submission = submissionRepository.save(submission);

        EvaluationRound round = EvaluationRound.builder()
                .submission(submission)
                .roundNumber(nextRoundNumber)
                .diagramDataSnapshot(submission.getDiagramData())
                .roundStatus(SubmissionStatus.PROCESSING)
                .submittedAt(submission.getSubmittedAt())
                .build();
        round = evaluationRoundRepository.save(round);

        if (evaluationAsyncEnabled) {
            EvaluationJobPayload payload = EvaluationJobPayload.builder()
                    .jobId("submission-" + submission.getSubmissionId() + "-round-" + round.getRoundNumber())
                    .idempotencyKey(submission.getSubmissionId() + ":" + round.getRoundNumber())
                    .submissionId(submission.getSubmissionId())
                    .roundId(round.getRoundId())
                    .roundNumber(round.getRoundNumber())
                    .userId(submission.getUser().getUserId())
                    .exerciseId(submission.getExercise().getExerciseId())
                    .diagramData(submission.getDiagramData())
                    .queuedAt(LocalDateTime.now().toString())
                    .attempt(0)
                    .build();
            publishAfterCommit(payload);
            return toSummaryResponse(submission);
        }

        AIEvaluation evaluation = mockEvaluationService.evaluateAndPersist(submission);
        persistRoundResult(round, evaluation);
        submission.setSubmissionStatus(SubmissionStatus.GRADED);
        SubmissionResponse response = toSummaryResponse(submissionRepository.save(submission));
        attachEvaluationData(response, submission.getSubmissionId(), true);
        return response;
    }

    private void publishAfterCommit(EvaluationJobPayload payload) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            evaluationJobPublisher.publish(payload);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                evaluationJobPublisher.publish(payload);
            }
        });
    }

    @Override
    public List<SubmissionResponse> getStudentSubmissions(Long userId) {
        return submissionRepository.findAllByUser_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SubmissionResponse getStudentSubmissionById(Long userId, Long submissionId) {
        Submission submission = submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        
        SubmissionResponse response = toSummaryResponse(submission);
        attachEvaluationData(response, submissionId, true);

        return response;
    }

    @Override
    public SubmissionStatusResponse getStudentSubmissionStatus(Long userId, Long submissionId) {
        Submission submission = submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        EvaluationRound latestRound = latestRound(submissionId).orElse(null);
        boolean evaluationReady = latestRound != null
                ? latestRound.getRoundStatus() == SubmissionStatus.GRADED
                : aiEvaluationRepository.findBySubmission_SubmissionId(submissionId).isPresent();
        return SubmissionStatusResponse.builder()
                .submissionId(submission.getSubmissionId())
                .submissionStatus(submission.getSubmissionStatus())
                .submittedAt(submission.getSubmittedAt())
                .evaluationReady(evaluationReady)
                .currentRound(latestRound != null ? latestRound.getRoundNumber() : 0)
                .roundsUsed(roundsUsed(submissionId))
                .maxRounds(MAX_EVALUATION_ROUNDS)
                .canResubmit(canResubmit(submission))
                .build();
    }

    @Override
    public AIEvaluationResponse getStudentEvaluationBySubmissionId(Long userId, Long submissionId) {
        submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        AIEvaluation evaluation = aiEvaluationRepository.findBySubmission_SubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No evaluation found for submission id: " + submissionId));
        return toEvaluationResponse(evaluation, latestGradedRound(submissionId).orElse(null), true);
    }

    @Override
    public List<EvaluationRoundResponse> getStudentEvaluationRounds(Long userId, Long submissionId) {
        submissionRepository.findBySubmissionIdAndUser_UserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        return evaluationRoundRepository.findAllBySubmission_SubmissionIdOrderByRoundNumberAsc(submissionId)
                .stream()
                .map(round -> toRoundResponse(round, true))
                .collect(Collectors.toList());
    }

    private boolean isExerciseAvailableForStudent(Exercise exercise, Long studentId) {
        if (exercise.getExerciseSource() == ExerciseSource.MANUAL) {
            return Boolean.TRUE.equals(exercise.getIsPublished());
        }

        if (exercise.getExerciseSource() == ExerciseSource.AI_GENERATED) {
            return exercise.getOwnerStudent() != null
                    && studentId.equals(exercise.getOwnerStudent().getUserId());
        }

        return false;
    }

    // ----------------------------- Mappers -----------------------------

    private SubmissionResponse toSummaryResponse(Submission s) {
        return SubmissionResponse.builder()
                .submissionId(s.getSubmissionId())
                .userId(s.getUser().getUserId())
                .userFullName(s.getUser().getFullName())
                .userEmail(s.getUser().getUserEmail())
                .exerciseId(s.getExercise().getExerciseId())
                .exerciseCode(s.getExercise().getExerciseCode())
                .exerciseTitle(s.getExercise().getExTitle())
                .diagramData(s.getDiagramData())
                .submissionStatus(s.getSubmissionStatus())
                .createdAt(s.getCreatedAt())
                .submittedAt(s.getSubmittedAt())
                .currentRound(latestRound(s.getSubmissionId()).map(EvaluationRound::getRoundNumber).orElse(0))
                .roundsUsed(roundsUsed(s.getSubmissionId()))
                .maxRounds(MAX_EVALUATION_ROUNDS)
                .canResubmit(canResubmit(s))
                .build();
    }

    private AIEvaluationResponse toEvaluationResponse(AIEvaluation eval, EvaluationRound round, boolean includeDetails) {
        List<EvaluationDetailResponse> details = null;
        if (includeDetails) {
            List<EvaluationDetail> detailEntities = mockEvaluationService.getDetails(eval.getEvaluationId());
            details = detailEntities.stream()
                    .map(d -> EvaluationDetailResponse.builder()
                            .detailId(d.getDetailId())
                            .errorType(d.getErrorType())
                            .evaDescription(d.getEvaDescription())
                            .errorLocation(d.getErrorLocation())
                            .build())
                    .collect(Collectors.toList());
        }

        return AIEvaluationResponse.builder()
                .evaluationId(eval.getEvaluationId())
                .submissionId(eval.getSubmission().getSubmissionId())
                .roundId(round != null ? round.getRoundId() : null)
                .roundNumber(round != null ? round.getRoundNumber() : null)
                .roundsUsed(roundsUsed(eval.getSubmission().getSubmissionId()))
                .maxRounds(MAX_EVALUATION_ROUNDS)
                .canResubmit(canResubmit(eval.getSubmission()))
                .overallScore(eval.getOverallScore())
                .evaluatedAt(eval.getEvaluatedAt())
                .provider(eval.getProvider())
                .model(eval.getModel())
                .fallbackUsed(eval.getFallbackUsed())
                .fallbackFrom(eval.getFallbackFrom())
                .details(details)
                .build();
    }

    private void attachEvaluationData(SubmissionResponse response, Long submissionId, boolean includeDetails) {
        EvaluationRound latestGradedRound = latestGradedRound(submissionId).orElse(null);
        aiEvaluationRepository.findBySubmission_SubmissionId(submissionId)
                .ifPresent(eval -> response.setEvaluation(toEvaluationResponse(eval, latestGradedRound, includeDetails)));
        response.setEvaluationRounds(evaluationRoundRepository.findAllBySubmission_SubmissionIdOrderByRoundNumberAsc(submissionId)
                .stream()
                .map(round -> toRoundResponse(round, includeDetails))
                .collect(Collectors.toList()));
    }

    private EvaluationRoundResponse toRoundResponse(EvaluationRound round, boolean includeDetails) {
        return EvaluationRoundResponse.builder()
                .roundId(round.getRoundId())
                .submissionId(round.getSubmission().getSubmissionId())
                .roundNumber(round.getRoundNumber())
                .roundStatus(round.getRoundStatus())
                .overallScore(round.getOverallScore())
                .provider(round.getProvider())
                .model(round.getModel())
                .fallbackUsed(round.getFallbackUsed())
                .fallbackFrom(round.getFallbackFrom())
                .submittedAt(round.getSubmittedAt())
                .gradedAt(round.getGradedAt())
                .details(includeDetails ? snapshotDetails(round) : null)
                .build();
    }

    private AdminEvaluationRoundResponse toAdminRoundResponse(EvaluationRound round) {
        Submission submission = round.getSubmission();
        User student = submission.getUser();
        return AdminEvaluationRoundResponse.builder()
                .roundId(round.getRoundId())
                .submissionId(submission.getSubmissionId())
                .studentId(student.getUserId())
                .studentName(student.getFullName())
                .studentEmail(student.getUserEmail())
                .roundNumber(round.getRoundNumber())
                .roundStatus(round.getRoundStatus())
                .overallScore(round.getOverallScore())
                .provider(round.getProvider())
                .model(round.getModel())
                .fallbackUsed(round.getFallbackUsed())
                .fallbackFrom(round.getFallbackFrom())
                .submittedAt(round.getSubmittedAt())
                .gradedAt(round.getGradedAt())
                .build();
    }

    private List<EvaluationDetailResponse> snapshotDetails(EvaluationRound round) {
        if (round.getDetailsSnapshot() == null) {
            return List.of();
        }
        return round.getDetailsSnapshot().stream()
                .map(detail -> EvaluationDetailResponse.builder()
                        .detailId(null)
                        .errorType(readString(detail, "errorType"))
                        .evaDescription(readString(detail, "evaDescription"))
                        .errorLocation(readString(detail, "errorLocation"))
                        .build())
                .collect(Collectors.toList());
    }

    private void persistRoundResult(EvaluationRound round, AIEvaluation evaluation) {
        List<EvaluationDetail> details = mockEvaluationService.getDetails(evaluation.getEvaluationId());
        round.setRoundStatus(SubmissionStatus.GRADED);
        round.setOverallScore(evaluation.getOverallScore());
        round.setProvider(evaluation.getProvider());
        round.setModel(evaluation.getModel());
        round.setFallbackUsed(evaluation.getFallbackUsed());
        round.setFallbackFrom(evaluation.getFallbackFrom());
        round.setGradedAt(evaluation.getEvaluatedAt());
        round.setDetailsSnapshot(details.stream()
                .map(detail -> {
                    Map<String, Object> snapshot = new HashMap<>();
                    snapshot.put("errorType", detail.getErrorType());
                    snapshot.put("evaDescription", detail.getEvaDescription());
                    snapshot.put("errorLocation", detail.getErrorLocation());
                    return snapshot;
                })
                .collect(Collectors.toList()));
        evaluationRoundRepository.save(round);
    }

    private java.util.Optional<EvaluationRound> latestRound(Long submissionId) {
        return evaluationRoundRepository.findTopBySubmission_SubmissionIdOrderByRoundNumberDesc(submissionId);
    }

    private java.util.Optional<EvaluationRound> latestGradedRound(Long submissionId) {
        return evaluationRoundRepository.findTopBySubmission_SubmissionIdAndRoundStatusOrderByRoundNumberDesc(
                submissionId,
                SubmissionStatus.GRADED);
    }

    private int roundsUsed(Long submissionId) {
        return Math.toIntExact(evaluationRoundRepository.countBySubmission_SubmissionId(submissionId));
    }

    private int nextRoundNumber(Long submissionId) {
        return latestRound(submissionId)
                .map(round -> round.getRoundNumber() + 1)
                .orElse(1);
    }

    private boolean canResubmit(Submission submission) {
        return roundsUsed(submission.getSubmissionId()) < MAX_EVALUATION_ROUNDS
                && (submission.getSubmissionStatus() == SubmissionStatus.GRADED
                || submission.getSubmissionStatus() == SubmissionStatus.FAILED
                || submission.getSubmissionStatus() == SubmissionStatus.DRAFT);
    }

    private String readString(Map<String, Object> source, String key) {
        Object value = source.get(key);
        return value instanceof String text ? text : null;
    }
}
