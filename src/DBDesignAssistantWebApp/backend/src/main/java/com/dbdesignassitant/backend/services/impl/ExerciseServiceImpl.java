package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.request.ExerciseRequest;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;
import com.dbdesignassitant.backend.dtos.response.LlmResponse;
import com.dbdesignassitant.backend.dtos.response.RetrievedKnowledgeResponse;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.mappers.ResponseMapper;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.ExerciseService;
import com.dbdesignassitant.backend.services.KnowledgeRetrievalService;
import com.dbdesignassitant.backend.services.LlmClient;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExerciseServiceImpl implements ExerciseService {
        private static final int CODE_SUFFIX_LENGTH = 6;
        private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
        private static final int EXERCISE_CONTEXT_LIMIT = 3;
        private static final String REVIEW_STATUS_KEY = "reviewStatus";
        private static final String REVIEW_STATUS_DRAFT = "DRAFT";
        private static final String REVIEW_STATUS_APPROVED = "APPROVED";
        private static final String REVIEW_STATUS_REJECTED = "REJECTED";
        private static final String REVIEW_SOURCE_KEY = "reviewSource";
        private static final String REVIEW_CREATED_AT_KEY = "reviewCreatedAt";
        private static final String REVIEWED_AT_KEY = "reviewedAt";
        private static final String REVIEWED_BY_ROLE_KEY = "reviewedByRole";
        private static final String REJECT_REASON_KEY = "rejectReason";
        private static final String REVIEW_PURPOSE_KEY = "reviewPurpose";
        private static final String REVIEW_PURPOSE_AI_GENERATION_TRIAL = "AI_GENERATION_TRIAL";
        private static final String APPROVED_FOR_GENERATION_KEY = "approvedForGeneration";
        private static final String REVISION_OF_EXERCISE_ID_KEY = "revisionOfExerciseId";
        private static final String AI_GENERATION_POLICY_KEY = "aiGenerationPolicy";
        private final SecureRandom secureRandom = new SecureRandom();
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final List<LlmClient> llmClients;
    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;

    @Override
    public ExerciseResponse createExercise(ExerciseRequest request) {
        User createdBy = userRepository.findById(request.getCreatedById())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ExerciseSource source = resolveSource(request.getExerciseSource(), null);
        String exerciseCode = resolveExerciseCode(request.getExerciseCode(), null, source);
        User ownerStudent = resolveOwnerStudent(source, request.getOwnerStudentId(), null);
        Exercise baseExercise = resolveBaseExercise(source, request.getBaseExerciseId(), null);

        Exercise exercise = Exercise.builder()
                .exTitle(request.getExTitle())
                .exDescription(request.getExDescription())
                .scenarioData(request.getScenarioData())
                .exerciseSource(source)
                .exerciseCode(exerciseCode)
                .createdBy(createdBy)
                .ownerStudent(ownerStudent)
                .baseExercise(baseExercise)
                .isPublished(request.getIsPublished())
                .build();

        return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
    }

    @Override
    public ExerciseResponse updateExercise(Long exerciseId, ExerciseRequest request) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        User createdBy = userRepository.findById(request.getCreatedById())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ExerciseSource source = resolveSource(request.getExerciseSource(), exercise.getExerciseSource());
        String exerciseCode = resolveExerciseCode(request.getExerciseCode(), exercise.getExerciseCode(), source);
        User ownerStudent = resolveOwnerStudent(source, request.getOwnerStudentId(), exercise.getOwnerStudent());
        Exercise baseExercise = resolveBaseExercise(source, request.getBaseExerciseId(), exercise.getBaseExercise());

        exercise.setExTitle(request.getExTitle());
        exercise.setExDescription(request.getExDescription());
        exercise.setScenarioData(request.getScenarioData());
        exercise.setExerciseSource(source);
        exercise.setExerciseCode(exerciseCode);
        exercise.setCreatedBy(createdBy);
        exercise.setOwnerStudent(ownerStudent);
        exercise.setBaseExercise(baseExercise);
        exercise.setIsPublished(request.getIsPublished());

        return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
    }

    @Override
    public ExerciseResponse getExerciseById(Long exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        return ResponseMapper.toExerciseResponse(exercise);
    }

    @Override
    public List<ExerciseResponse> getAllExercises() {
        return exerciseRepository.findAll().stream()
                .map(ResponseMapper::toExerciseResponse)
                .collect(Collectors.toList());
    }

        @Override
        public List<ExerciseResponse> getExercises(String search, ExerciseSource source, Boolean isPublished) {
                String normalizedSearch = search == null ? null : search.trim();
                if (normalizedSearch != null && normalizedSearch.isEmpty()) {
                        normalizedSearch = null;
                }
                return exerciseRepository.findAllWithFilters(normalizedSearch, source, isPublished).stream()
                                .map(ResponseMapper::toExerciseResponse)
                                .collect(Collectors.toList());
        }

    @Override
    public void deleteExercise(Long exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        exerciseRepository.delete(exercise);
    }

        @Override
        public ExerciseResponse setExercisePublished(Long exerciseId, boolean isPublished) {
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                validatePublishAllowed(exercise, isPublished);
                exercise.setIsPublished(isPublished);
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        // --- Student Methods ---
        @Override
        @Transactional(readOnly = true)
        public List<ExerciseResponse> getStudentExercises(String search, boolean archived) {
                String normalizedSearch = search == null ? null : search.trim();
                if (normalizedSearch != null && normalizedSearch.isEmpty()) {
                        normalizedSearch = null;
                }
                User currentUser = currentUserProvider.getCurrentUser();
                return exerciseRepository.findStudentVisibleExercises(
                                currentUser.getUserId(),
                                normalizedSearch,
                                archived).stream()
                                .filter(exercise -> isExerciseVisibleToStudent(exercise, currentUser.getUserId())
                                                && matchesStudentArchiveView(exercise, currentUser.getUserId(), archived))
                                .map(ResponseMapper::toExerciseResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public ExerciseResponse getStudentExerciseById(Long exerciseId) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));

                if (!isStudentOwnedAiExercise(exercise, currentUser.getUserId())) {
                        if (exercise.getExerciseSource() == ExerciseSource.MANUAL) {
                                throw new BadRequestException(
                                                "Manual exercises are templates for AI generation and cannot be opened directly by students");
                        }
                        throw new ResourceNotFoundException("Exercise not found");
                }
                return ResponseMapper.toExerciseResponse(exercise);
        }

        @Override
        @Transactional
        public ExerciseResponse setStudentExerciseArchived(Long exerciseId, boolean archived) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                if (!isStudentOwnedAiExercise(exercise, currentUser.getUserId())) {
                        if (exercise.getExerciseSource() == ExerciseSource.MANUAL
                                        && Boolean.TRUE.equals(exercise.getIsPublished())) {
                                throw new BadRequestException("Only student-private AI-generated exercises can be archived");
                        }
                        throw new ResourceNotFoundException("Exercise not found");
                }

                exercise.setStudentArchived(archived);
                exercise.setStudentArchivedAt(archived ? LocalDateTime.now() : null);

                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        @Override
        @Transactional
        public ExerciseGenerationResponse generateStudentExercise(ExerciseGenerationRequest request) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise baseExercise = resolveGenerationBaseExercise(request.getBaseExerciseId());
                List<Exercise> sampleExercises = resolveGenerationSampleExercises(request, baseExercise);
                List<RetrievedKnowledgeResponse> knowledgeSources = retrieveGenerationKnowledge(request);
                String prompt = buildExerciseGenerationPrompt(request, sampleExercises, knowledgeSources, null);

                GeneratedExercise generatedExercise = generateExerciseContent(request, prompt, knowledgeSources);
                String exerciseCode = resolveExerciseCode(null, null, ExerciseSource.AI_GENERATED);
                Exercise exercise = Exercise.builder()
                                .exTitle(generatedExercise.title())
                                .exDescription(generatedExercise.description())
                                .scenarioData(generatedExercise.scenarioData())
                                .exerciseSource(ExerciseSource.AI_GENERATED)
                                .exerciseCode(exerciseCode)
                                .createdBy(currentUser)
                                .ownerStudent(currentUser)
                                .baseExercise(baseExercise)
                                .isPublished(false)
                                .build();

                return toGenerationResponse(exerciseRepository.save(exercise));
        }

        @Override
        @Transactional
        public ExerciseGenerationResponse generateAdminExercise(ExerciseGenerationRequest request) {
                User currentUser = currentUserProvider.getCurrentUser();
                return generateStaffExercise(currentUser, request, "ADMIN");
        }

        @Override
        @Transactional
        public ExerciseResponse approveAdminGeneratedExercise(Long exerciseId, boolean publish) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                return approveGeneratedExercise(exercise, currentUser, publish);
        }

        @Override
        @Transactional
        public ExerciseResponse rejectAdminGeneratedExercise(Long exerciseId, String reason) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                return rejectGeneratedExercise(exercise, currentUser, reason);
        }

        // --- Instructor Methods ---

        private Exercise getInstructorExercise(Long currentUserId, Long exerciseId) {
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                if (!exercise.getCreatedBy().getUserId().equals(currentUserId)) {
                        throw new BadRequestException("You do not have permission to access this exercise");
                }
                return exercise;
        }

        @Override
        public List<ExerciseResponse> getInstructorExercises(Long currentUserId, String search, Boolean isPublished) {
                String normalizedSearch = search == null ? null : search.trim();
                if (normalizedSearch != null && normalizedSearch.isEmpty()) {
                        normalizedSearch = null;
                }
                return exerciseRepository.findAllInstructorExercisesWithFilters(currentUserId, normalizedSearch, isPublished).stream()
                                .map(ResponseMapper::toExerciseResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public ExerciseResponse getInstructorExerciseById(Long currentUserId, Long exerciseId) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);
                return ResponseMapper.toExerciseResponse(exercise);
        }

        @Override
        public ExerciseResponse createInstructorExercise(Long currentUserId, ExerciseRequest request) {
                User createdBy = userRepository.findById(currentUserId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

                // Force source to MANUAL
                ExerciseSource source = ExerciseSource.MANUAL;
                String exerciseCode = resolveExerciseCode(request.getExerciseCode(), null, source);

                Exercise exercise = Exercise.builder()
                                .exTitle(request.getExTitle())
                                .exDescription(request.getExDescription())
                                .scenarioData(request.getScenarioData())
                                .exerciseSource(source)
                                .exerciseCode(exerciseCode)
                                .createdBy(createdBy)
                                .ownerStudent(null)
                                .baseExercise(null)
                                .isPublished(request.getIsPublished() != null ? request.getIsPublished() : false)
                                .build();

                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        @Override
        public ExerciseResponse updateInstructorExercise(Long currentUserId, Long exerciseId, ExerciseRequest request) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);

                // Force source to MANUAL
                ExerciseSource source = ExerciseSource.MANUAL;
                String exerciseCode = resolveExerciseCode(request.getExerciseCode(), exercise.getExerciseCode(), source);

                exercise.setExTitle(request.getExTitle());
                exercise.setExDescription(request.getExDescription());
                exercise.setScenarioData(request.getScenarioData());
                exercise.setExerciseSource(source);
                exercise.setExerciseCode(exerciseCode);
                exercise.setIsPublished(request.getIsPublished() != null ? request.getIsPublished() : exercise.getIsPublished());

                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        @Override
        public void deleteInstructorExercise(Long currentUserId, Long exerciseId) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);
                exerciseRepository.delete(exercise);
        }

        @Override
        public ExerciseResponse setInstructorExercisePublished(Long currentUserId, Long exerciseId, boolean isPublished) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);
                validatePublishAllowed(exercise, isPublished);
                exercise.setIsPublished(isPublished);
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        @Override
        @Transactional
        public ExerciseGenerationResponse generateInstructorExercise(Long currentUserId, ExerciseGenerationRequest request) {
                User currentUser = userRepository.findById(currentUserId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                return generateStaffExercise(currentUser, request, "INSTRUCTOR");
        }

        @Override
        @Transactional
        public ExerciseResponse approveInstructorGeneratedExercise(Long currentUserId, Long exerciseId, boolean publish) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);
                User currentUser = userRepository.findById(currentUserId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                return approveGeneratedExercise(exercise, currentUser, publish);
        }

        @Override
        @Transactional
        public ExerciseResponse rejectInstructorGeneratedExercise(Long currentUserId, Long exerciseId, String reason) {
                Exercise exercise = getInstructorExercise(currentUserId, exerciseId);
                User currentUser = userRepository.findById(currentUserId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                return rejectGeneratedExercise(exercise, currentUser, reason);
        }

        private ExerciseGenerationResponse generateStaffExercise(
                        User currentUser,
                        ExerciseGenerationRequest request,
                        String reviewSource) {
                validateStaffGenerationRequest(request);
                Exercise baseExercise = resolveGenerationBaseExercise(request.getBaseExerciseId());
                Exercise rejectedRevisionSource = resolveLatestRejectedStaffTrial(baseExercise);
                List<Exercise> sampleExercises = resolveGenerationSampleExercises(request, baseExercise);
                List<RetrievedKnowledgeResponse> knowledgeSources = retrieveGenerationKnowledge(request);
                String prompt = buildExerciseGenerationPrompt(
                                request,
                                sampleExercises,
                                knowledgeSources,
                                rejectedRevisionSource);

                GeneratedExercise generatedExercise = generateExerciseContent(request, prompt, knowledgeSources);
                String exerciseCode = resolveExerciseCode(null, null, ExerciseSource.AI_GENERATED);
                Exercise exercise = Exercise.builder()
                                .exTitle(generatedExercise.title())
                                .exDescription(generatedExercise.description())
                                .scenarioData(withDraftReviewMetadata(
                                                generatedExercise.scenarioData(),
                                                baseExercise,
                                                reviewSource,
                                                rejectedRevisionSource))
                                .exerciseSource(ExerciseSource.AI_GENERATED)
                                .exerciseCode(exerciseCode)
                                .createdBy(currentUser)
                                .ownerStudent(null)
                                .baseExercise(baseExercise)
                                .isPublished(false)
                                .build();

                return toGenerationResponse(exerciseRepository.save(exercise));
        }

        private void validateStaffGenerationRequest(ExerciseGenerationRequest request) {
                boolean hasBaseExercise = request.getBaseExerciseId() != null;
                boolean hasPromptContext = StringUtils.hasText(request.getCustomPrompt())
                                || StringUtils.hasText(request.getBusinessContext())
                                || StringUtils.hasText(request.getTopic())
                                || StringUtils.hasText(request.getBusinessDomain())
                                || StringUtils.hasText(request.getAdditionalRequirements())
                                || StringUtils.hasText(request.getKeywords());
                if (!hasBaseExercise && !hasPromptContext) {
                        throw new BadRequestException("Provide a base exercise or prompt context to generate an exercise");
                }
        }

        private ExerciseResponse approveGeneratedExercise(Exercise exercise, User reviewer, boolean publish) {
                validateStaffGeneratedExercise(exercise);
                Map<String, Object> scenarioData = copyScenarioData(exercise);
                scenarioData.put(REVIEW_STATUS_KEY, REVIEW_STATUS_APPROVED);
                scenarioData.put(REVIEWED_AT_KEY, LocalDateTime.now().toString());
                scenarioData.put(REVIEWED_BY_ROLE_KEY, roleName(reviewer));
                scenarioData.put(REVIEW_PURPOSE_KEY, REVIEW_PURPOSE_AI_GENERATION_TRIAL);
                scenarioData.put(APPROVED_FOR_GENERATION_KEY, exercise.getBaseExercise() != null);
                scenarioData.remove(REJECT_REASON_KEY);
                exercise.setScenarioData(scenarioData);
                exercise.setIsPublished(false);
                if (exercise.getBaseExercise() != null) {
                        markBaseExerciseApprovedForGeneration(
                                        exercise.getBaseExercise(),
                                        exercise,
                                        reviewer,
                                        null);
                } else if (publish) {
                        log.info("Ignoring publish=true for staff AI generation trial {} without a base exercise",
                                        exercise.getExerciseId());
                }
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        private ExerciseResponse rejectGeneratedExercise(Exercise exercise, User reviewer, String reason) {
                validateStaffGeneratedExercise(exercise);
                if (!StringUtils.hasText(reason)) {
                        throw new BadRequestException("Reject reason is required for AI generation trial");
                }
                Map<String, Object> scenarioData = copyScenarioData(exercise);
                scenarioData.put(REVIEW_STATUS_KEY, REVIEW_STATUS_REJECTED);
                scenarioData.put(REVIEWED_AT_KEY, LocalDateTime.now().toString());
                scenarioData.put(REVIEWED_BY_ROLE_KEY, roleName(reviewer));
                scenarioData.put(REVIEW_PURPOSE_KEY, REVIEW_PURPOSE_AI_GENERATION_TRIAL);
                scenarioData.put(APPROVED_FOR_GENERATION_KEY, false);
                scenarioData.put(REJECT_REASON_KEY, reason.trim());
                exercise.setScenarioData(scenarioData);
                exercise.setIsPublished(false);
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        private void validateStaffGeneratedExercise(Exercise exercise) {
                if (exercise.getExerciseSource() != ExerciseSource.AI_GENERATED) {
                        throw new BadRequestException("Only AI-generated exercises can be reviewed");
                }
                if (exercise.getOwnerStudent() != null) {
                        throw new BadRequestException("Student-private AI-generated exercises cannot be reviewed by staff");
                }
        }

        private void validatePublishAllowed(Exercise exercise, boolean isPublished) {
                if (!isPublished) {
                        return;
                }
                if (exercise.getExerciseSource() == ExerciseSource.AI_GENERATED) {
                        throw new BadRequestException("AI-generated exercises cannot be published directly");
                }
        }

        private boolean isExerciseVisibleToStudent(Exercise exercise, Long studentId) {
                return isStudentOwnedAiExercise(exercise, studentId);
        }

        private boolean matchesStudentArchiveView(Exercise exercise, Long studentId, boolean archived) {
                if (archived) {
                        return isStudentOwnedAiExercise(exercise, studentId)
                                        && Boolean.TRUE.equals(exercise.getStudentArchived());
                }
                if (isStudentOwnedAiExercise(exercise, studentId)) {
                        return !Boolean.TRUE.equals(exercise.getStudentArchived());
                }
                return false;
        }

        private boolean isStudentOwnedAiExercise(Exercise exercise, Long studentId) {
                return exercise.getExerciseSource() == ExerciseSource.AI_GENERATED
                                && exercise.getOwnerStudent() != null
                                && exercise.getOwnerStudent().getUserId().equals(studentId);
        }

        private boolean isReviewRejected(Exercise exercise) {
                Object status = exercise.getScenarioData() == null
                                ? null
                                : exercise.getScenarioData().get(REVIEW_STATUS_KEY);
                return REVIEW_STATUS_REJECTED.equals(String.valueOf(status));
        }

        private Map<String, Object> withDraftReviewMetadata(
                        Map<String, Object> source,
                        Exercise baseExercise,
                        String reviewSource,
                        Exercise revisionSource) {
                Map<String, Object> scenarioData = new LinkedHashMap<>(source == null ? Map.of() : source);
                scenarioData.put(REVIEW_STATUS_KEY, REVIEW_STATUS_DRAFT);
                scenarioData.put(REVIEW_SOURCE_KEY, reviewSource);
                scenarioData.put(REVIEW_PURPOSE_KEY, REVIEW_PURPOSE_AI_GENERATION_TRIAL);
                scenarioData.put(APPROVED_FOR_GENERATION_KEY, false);
                scenarioData.put(REVIEW_CREATED_AT_KEY, LocalDateTime.now().toString());
                scenarioData.remove(REVIEWED_AT_KEY);
                scenarioData.remove(REVIEWED_BY_ROLE_KEY);
                scenarioData.remove(REJECT_REASON_KEY);
                if (baseExercise != null) {
                        scenarioData.put("baseExerciseId", baseExercise.getExerciseId());
                        scenarioData.put("baseExerciseCode", baseExercise.getExerciseCode());
                }
                if (revisionSource != null) {
                        scenarioData.put(REVISION_OF_EXERCISE_ID_KEY, revisionSource.getExerciseId());
                }
                return scenarioData;
        }

        private Map<String, Object> copyScenarioData(Exercise exercise) {
                return new LinkedHashMap<>(exercise.getScenarioData() == null ? Map.of() : exercise.getScenarioData());
        }

        private void markBaseExerciseApprovedForGeneration(
                        Exercise baseExercise,
                        Exercise approvedTrial,
                        User reviewer,
                        String notes) {
                Map<String, Object> scenarioData = copyScenarioData(baseExercise);
                Map<String, Object> policy = copyObjectMap(scenarioData.get(AI_GENERATION_POLICY_KEY));
                policy.put("enabled", true);
                policy.put("approvedTrialExerciseId", approvedTrial.getExerciseId());
                policy.put("approvedAt", LocalDateTime.now().toString());
                policy.put("approvedByRole", roleName(reviewer));
                if (StringUtils.hasText(notes)) {
                        policy.put("notes", notes.trim());
                }
                scenarioData.put(AI_GENERATION_POLICY_KEY, policy);
                baseExercise.setScenarioData(scenarioData);
                exerciseRepository.save(baseExercise);
        }

        private Map<String, Object> copyObjectMap(Object value) {
                Map<String, Object> copy = new LinkedHashMap<>();
                if (value instanceof Map<?, ?> existing) {
                        existing.forEach((key, entryValue) -> {
                                if (key != null) {
                                        copy.put(String.valueOf(key), entryValue);
                                }
                        });
                }
                return copy;
        }

        private Exercise resolveLatestRejectedStaffTrial(Exercise baseExercise) {
                if (baseExercise == null || baseExercise.getExerciseId() == null) {
                        return null;
                }
                return exerciseRepository.findStaffAiTrialsByBaseExerciseId(baseExercise.getExerciseId())
                                .stream()
                                .filter(this::isReviewRejected)
                                .findFirst()
                                .orElse(null);
        }

        private String roleName(User user) {
                if (user == null || user.getRole() == null || user.getRole().getRoleName() == null) {
                        return "";
                }
                return user.getRole().getRoleName().name();
        }

        private Exercise resolveGenerationBaseExercise(Long baseExerciseId) {
                if (baseExerciseId == null) {
                        return null;
                }

                Exercise baseExercise = exerciseRepository.findById(baseExerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Base exercise not found"));
                if (baseExercise.getExerciseSource() != ExerciseSource.MANUAL
                                || !Boolean.TRUE.equals(baseExercise.getIsPublished())) {
                        throw new BadRequestException("Base exercise must be a published MANUAL exercise");
                }
                return baseExercise;
        }

        private List<Exercise> resolveGenerationSampleExercises(
                        ExerciseGenerationRequest request,
                        Exercise baseExercise) {
                if (baseExercise != null) {
                        return List.of(baseExercise);
                }

                List<Exercise> matched = exerciseRepository
                                .findPublishedManualExercisesForGeneration(buildSampleSearch(request))
                                .stream()
                                .limit(EXERCISE_CONTEXT_LIMIT)
                                .toList();
                if (!matched.isEmpty()) {
                        return matched;
                }

                return exerciseRepository.findPublishedManualExercisesForGeneration(null)
                                .stream()
                                .limit(EXERCISE_CONTEXT_LIMIT)
                                .toList();
        }

        private List<RetrievedKnowledgeResponse> retrieveGenerationKnowledge(ExerciseGenerationRequest request) {
                String query = String.join(" ",
                                normalizePart(request.getCustomPrompt()),
                                normalizePart(request.getTopic()),
                                normalizePart(request.getDifficulty()),
                                normalizePart(request.getBusinessDomain()),
                                normalizePart(request.getBusinessContext()),
                                normalizePart(request.getKeywords()),
                                normalizePart(request.getAdditionalRequirements()))
                                .trim();
                int topK = Math.max(1, aiProperties.getRag().getTopK());
                KnowledgeRetrievalResult result = knowledgeRetrievalService.retrieveTopK(query, topK);
                List<RetrievedKnowledgeResponse> sources = result.getSources() == null ? List.of() : result.getSources();
                if (!sources.isEmpty()) {
                        log.info("Exercise generation KnowledgeBase context: retrievalMode={}, sourceIds={}",
                                        result.getRetrievalMode(),
                                        sources.stream().map(RetrievedKnowledgeResponse::getKbId).toList());
                }
                return sources;
        }

        private GeneratedExercise generateExerciseContent(
                        ExerciseGenerationRequest request,
                        String prompt,
                        List<RetrievedKnowledgeResponse> knowledgeSources) {
                LlmClient client = resolveGenerationClient();
                if (client.provider() == AiProvider.MOCK) {
                        return buildMockGeneratedExercise(request);
                }

                try {
                        LlmResponse response = client.generate(prompt, knowledgeSources);
                        return parseGeneratedExercise(response.getAnswer(), request);
                } catch (RuntimeException ex) {
                        log.warn("AI provider {} failed for exercise generation. Falling back to MOCK. Error: {}",
                                        client.provider(),
                                        ex.getMessage());
                        return buildMockGeneratedExercise(request);
                }
        }

        private LlmClient resolveGenerationClient() {
                Map<AiProvider, LlmClient> clients = llmClients.stream()
                                .collect(Collectors.toMap(LlmClient::provider, Function.identity(), (first, second) -> first));
                LlmClient mockClient = clients.get(AiProvider.MOCK);
                if (mockClient == null) {
                        throw new IllegalStateException("MOCK AI provider is not registered");
                }
                LlmClient configuredClient = clients.getOrDefault(aiProperties.getProvider(), mockClient);
                if (configuredClient.isAvailable()) {
                        return configuredClient;
                }
                if (configuredClient.provider() != AiProvider.MOCK) {
                        log.warn("AI provider {} is not available for exercise generation. Falling back to MOCK.",
                                        configuredClient.provider());
                }
                return mockClient;
        }

        private GeneratedExercise parseGeneratedExercise(String answer, ExerciseGenerationRequest request) {
                String json = extractJsonObject(answer);
                Map<String, Object> parsed;
                try {
                        parsed = objectMapper.readValue(json, new TypeReference<>() {
                        });
                } catch (Exception ex) {
                        throw new BadRequestException("Generated exercise response is not valid JSON");
                }
                String title = readString(parsed, "title");
                String description = readString(parsed, "description");
                if (!StringUtils.hasText(title) || !StringUtils.hasText(description)) {
                        throw new BadRequestException("Generated exercise is missing title or description");
                }

                Map<String, Object> scenarioData = enrichScenarioData(parsed, request, "LLM");
                return new GeneratedExercise(title, description, scenarioData);
        }

        private String extractJsonObject(String answer) {
                if (!StringUtils.hasText(answer)) {
                        throw new BadRequestException("Generated exercise response is empty");
                }
                int start = answer.indexOf('{');
                int end = answer.lastIndexOf('}');
                if (start < 0 || end <= start) {
                        throw new BadRequestException("Generated exercise response is not JSON");
                }
                return answer.substring(start, end + 1);
        }

        private GeneratedExercise buildMockGeneratedExercise(ExerciseGenerationRequest request) {
                String customPrompt = normalizePart(request.getCustomPrompt());
                String topic = defaultIfBlank(request.getTopic(), "thiết kế cơ sở dữ liệu");
                String difficulty = defaultIfBlank(request.getDifficulty(), "MEDIUM");
                String domain = resolveMockDomain(request);
                String title = "Bài tập thiết kế CSDL - " + domain;
                String description = StringUtils.hasText(customPrompt)
                                ? "Hãy chuẩn hóa bối cảnh đã nhập và thiết kế mô hình dữ liệu phù hợp."
                                : "Hãy phân tích bối cảnh " + domain
                                                + " và thiết kế mô hình dữ liệu đáp ứng các yêu cầu nghiệp vụ đã cho.";

                List<String> requirements = List.of(
                                "Quản lý hồ sơ người dùng/khách hàng và thông tin định danh cần thiết.",
                                "Quản lý đối tượng nghiệp vụ chính, trạng thái và lịch sử xử lý.",
                                "Ghi nhận giao dịch phát sinh và truy vết mối liên kết giữa các đối tượng.");
                List<String> constraints = List.of(
                                "Mỗi thực thể chính cần có khóa định danh duy nhất.",
                                "Thông tin giao dịch phải tham chiếu đến các đối tượng nghiệp vụ hợp lệ.",
                                "Trạng thái nghiệp vụ chỉ được nhận các giá trị hợp lệ theo vòng đời xử lý.");
                String businessContext = firstNonBlank(
                                request.getBusinessContext(),
                                customPrompt,
                                "Một đơn vị vận hành " + domain
                                                + " cần quản lý người dùng, tài nguyên, giao dịch và lịch sử xử lý.");
                Map<String, Object> scenarioData = new LinkedHashMap<>();
                scenarioData.put("title", title);
                scenarioData.put("description", description);
                scenarioData.put("topic", topic);
                scenarioData.put("difficulty", difficulty);
                scenarioData.put("businessDomain", domain);
                scenarioData.put("businessContext", businessContext);
                scenarioData.put("requirements", requirements);
                scenarioData.put("functionalRequirements", requirements);
                scenarioData.put("constraints", constraints);
                scenarioData.put("dataConstraints", constraints);
                scenarioData.put("designScopeHints", List.of(
                                "Xác định các thực thể trung tâm, thuộc tính bắt buộc và khóa chính.",
                                "Mô tả quan hệ và cardinality giữa người dùng, tài nguyên và giao dịch.",
                                "Cân nhắc bảng trung gian nếu có quan hệ nhiều-nhiều."));
                scenarioData.put("keywords", normalizePart(request.getKeywords()));
                scenarioData.put("tags", buildScenarioTags(request));
                if (StringUtils.hasText(customPrompt)) {
                        scenarioData.put("studentPrompt", customPrompt);
                }
                scenarioData.put("additionalRequirements", normalizePart(request.getAdditionalRequirements()));
                return new GeneratedExercise(title, description, enrichScenarioData(scenarioData, request, "MOCK"));
        }

        private String buildExerciseGenerationPrompt(
                        ExerciseGenerationRequest request,
                        List<Exercise> sampleExercises,
                        List<RetrievedKnowledgeResponse> knowledgeSources,
                        Exercise rejectedTrial) {
                StringBuilder builder = new StringBuilder();
                builder.append("Bạn là chuyên gia tạo đề bài thực hành thiết kế cơ sở dữ liệu cho sinh viên.\n");
                builder.append("Chỉ tạo ĐỀ BÀI tự nhiên, rõ bối cảnh và yêu cầu; tuyệt đối không đưa lời giải, đáp án mẫu, SampleSolution hoặc SQL DDL hoàn chỉnh.\n");
                builder.append("Không nhắc tên các nhãn ngữ cảnh kỹ thuật trong nội dung đề bài.\n");
                builder.append("Trả về đúng một JSON object, không markdown, không giải thích ngoài JSON.\n");
                builder.append("JSON bắt buộc có các trường: title, description, businessContext, functionalRequirements, dataConstraints, designScopeHints, difficulty.\n");
                builder.append("functionalRequirements, dataConstraints, designScopeHints là mảng string.\n\n");
                builder.append("YEU_CAU_TAO_DE:\n");
                builder.append("customPrompt: ").append(normalizePart(request.getCustomPrompt())).append("\n");
                builder.append("topic: ").append(normalizePart(request.getTopic())).append("\n");
                builder.append("difficulty: ").append(normalizePart(request.getDifficulty())).append("\n");
                builder.append("businessDomain: ").append(normalizePart(request.getBusinessDomain())).append("\n");
                builder.append("businessContext: ").append(normalizePart(request.getBusinessContext())).append("\n");
                builder.append("keywords: ").append(normalizePart(request.getKeywords())).append("\n");
                builder.append("additionalRequirements: ").append(normalizePart(request.getAdditionalRequirements())).append("\n\n");
                builder.append("BAI_MAU_CONTEXT_KHONG_LO_SOLUTION:\n");
                if (sampleExercises.isEmpty()) {
                        builder.append("(Không có bài mẫu phù hợp.)\n\n");
                } else {
                        for (int i = 0; i < sampleExercises.size(); i++) {
                                Exercise sample = sampleExercises.get(i);
                                builder.append(i + 1)
                                                .append(". title: ").append(nullToEmpty(sample.getExTitle()))
                                                .append("\ndescription: ").append(nullToEmpty(sample.getExDescription()))
                                                .append("\nscenarioData: ")
                                                .append(safeScenarioContext(sample.getScenarioData()))
                                                .append("\n\n");
                        }
                }
                appendRejectedTrialFeedback(builder, rejectedTrial);
                builder.append("KNOWLEDGE_BASE_APPROVED_CONTEXT:\n");
                if (knowledgeSources.isEmpty()) {
                        builder.append("(Không có học liệu APPROVED phù hợp.)\n");
                } else {
                        for (int i = 0; i < knowledgeSources.size(); i++) {
                                RetrievedKnowledgeResponse source = knowledgeSources.get(i);
                                builder.append(i + 1)
                                                .append(". ").append(nullToEmpty(source.getKbTitle()))
                                                .append(" - ").append(nullToEmpty(source.getSnippet()))
                                                .append("\n");
                        }
                }
                return builder.toString();
        }

        private void appendRejectedTrialFeedback(StringBuilder builder, Exercise rejectedTrial) {
                if (rejectedTrial == null) {
                        return;
                }
                builder.append("FEEDBACK_BAN_KIEM_TRA_AI_BI_TU_CHOI:\n");
                builder.append("trialExerciseId: ").append(rejectedTrial.getExerciseId()).append("\n");
                builder.append("title: ").append(nullToEmpty(rejectedTrial.getExTitle())).append("\n");
                builder.append("description: ").append(nullToEmpty(rejectedTrial.getExDescription())).append("\n");
                builder.append("rejectReason: ")
                                .append(readScenarioString(rejectedTrial.getScenarioData(), REJECT_REASON_KEY))
                                .append("\n");
                builder.append("rejectedScenarioData: ")
                                .append(safeScenarioContext(rejectedTrial.getScenarioData()))
                                .append("\n");
                builder.append("Hay tao lai mot bien the tot hon dua tren bai mau goc, tranh lap lai cac loi da bi tu choi, va van khong dua loi giai/SampleSolution/SQL DDL.\n\n");
        }

        private String safeScenarioContext(Map<String, Object> scenarioData) {
                if (scenarioData == null || scenarioData.isEmpty()) {
                        return "{}";
                }
                Map<String, Object> copy = new LinkedHashMap<>(scenarioData);
                copy.remove("sampleSolution");
                copy.remove("sampleSolutions");
                copy.remove("solutionData");
                copy.remove("answer");
                try {
                        return objectMapper.writeValueAsString(copy);
                } catch (Exception ex) {
                        return copy.toString();
                }
        }

        private ExerciseGenerationResponse toGenerationResponse(Exercise exercise) {
                return ExerciseGenerationResponse.builder()
                                .exerciseId(exercise.getExerciseId())
                                .exerciseCode(exercise.getExerciseCode())
                                .title(exercise.getExTitle())
                                .description(exercise.getExDescription())
                                .scenarioData(exercise.getScenarioData())
                                .exerciseSource(exercise.getExerciseSource())
                                .ownerStudentId(exercise.getOwnerStudent() == null
                                                ? null
                                                : exercise.getOwnerStudent().getUserId())
                                .baseExerciseId(exercise.getBaseExercise() == null
                                                ? null
                                                : exercise.getBaseExercise().getExerciseId())
                                .isPublished(exercise.getIsPublished())
                                .build();
        }

        private String buildSampleSearch(ExerciseGenerationRequest request) {
                List<String> parts = new ArrayList<>();
                if (StringUtils.hasText(request.getCustomPrompt())) {
                        parts.add(request.getCustomPrompt().trim());
                }
                if (StringUtils.hasText(request.getTopic())) {
                        parts.add(request.getTopic().trim());
                }
                if (StringUtils.hasText(request.getBusinessDomain())) {
                        parts.add(request.getBusinessDomain().trim());
                }
                if (StringUtils.hasText(request.getBusinessContext())) {
                        parts.add(request.getBusinessContext().trim());
                }
                if (StringUtils.hasText(request.getKeywords())) {
                        parts.add(request.getKeywords().trim());
                }
                return parts.isEmpty() ? null : parts.get(0);
        }

        private Map<String, Object> enrichScenarioData(
                        Map<String, Object> source,
                        ExerciseGenerationRequest request,
                        String generationMode) {
                Map<String, Object> scenarioData = new LinkedHashMap<>(source);
                scenarioData.remove("sampleSolution");
                scenarioData.remove("sampleSolutions");
                scenarioData.remove("solutionData");
                scenarioData.remove("answer");

                scenarioData.putIfAbsent("difficulty", defaultIfBlank(request.getDifficulty(), "MEDIUM"));
                scenarioData.putIfAbsent("topic", normalizePart(request.getTopic()));
                scenarioData.putIfAbsent("businessDomain", normalizePart(request.getBusinessDomain()));

                String customPrompt = normalizePart(request.getCustomPrompt());
                String inputBusinessContext = normalizePart(request.getBusinessContext());
                if (StringUtils.hasText(customPrompt)) {
                        scenarioData.putIfAbsent("studentPrompt", customPrompt);
                }
                if (StringUtils.hasText(inputBusinessContext)) {
                        scenarioData.putIfAbsent("inputBusinessContext", inputBusinessContext);
                }
                if (!StringUtils.hasText(readString(scenarioData, "businessContext"))) {
                        String context = firstNonBlank(inputBusinessContext, customPrompt, request.getAdditionalRequirements());
                        if (StringUtils.hasText(context)) {
                                scenarioData.put("businessContext", context);
                        }
                }

                Object requirements = firstScenarioValue(
                                scenarioData,
                                List.of("requirements", "businessRequirements", "functionalRequirements", "tasks"));
                if (requirements != null) {
                        scenarioData.putIfAbsent("requirements", requirements);
                        scenarioData.putIfAbsent("functionalRequirements", requirements);
                }

                Object constraints = firstScenarioValue(
                                scenarioData,
                                List.of("constraints", "businessRules", "dataConstraints", "integrityConstraints"));
                if (constraints != null) {
                        scenarioData.putIfAbsent("constraints", constraints);
                        scenarioData.putIfAbsent("dataConstraints", constraints);
                }

                scenarioData.putIfAbsent("tags", buildScenarioTags(request));
                scenarioData.put("generationMode", generationMode);
                scenarioData.put(
                                "generationInputType",
                                StringUtils.hasText(customPrompt) ? "CUSTOM_PROMPT" : "PARAMETERIZED");
                return scenarioData;
        }

        private Object firstScenarioValue(Map<String, Object> data, List<String> keys) {
                for (String key : keys) {
                        Object value = data.get(key);
                        if (value != null) {
                                return value;
                        }
                }
                return null;
        }

        private List<String> buildScenarioTags(ExerciseGenerationRequest request) {
                List<String> tags = new ArrayList<>();
                addTag(tags, request.getTopic());
                addTag(tags, request.getBusinessDomain());
                if (StringUtils.hasText(request.getKeywords())) {
                        for (String keyword : request.getKeywords().split("[,;\\n]")) {
                                addTag(tags, keyword);
                        }
                }
                addTag(tags, request.getDifficulty());
                return tags;
        }

        private void addTag(List<String> tags, String value) {
                String normalized = normalizePart(value);
                if (StringUtils.hasText(normalized) && !tags.contains(normalized)) {
                        tags.add(normalized);
                }
        }

        private String resolveMockDomain(ExerciseGenerationRequest request) {
                String domain = normalizePart(request.getBusinessDomain());
                if (StringUtils.hasText(domain)) {
                        return domain;
                }
                String customPrompt = normalizePart(request.getCustomPrompt());
                if (StringUtils.hasText(customPrompt)) {
                        return abbreviateForTitle(customPrompt);
                }
                return "thu vien so";
        }

        private String abbreviateForTitle(String value) {
                String normalized = value.replaceAll("\\s+", " ").trim();
                if (normalized.length() <= 60) {
                        return normalized;
                }
                return normalized.substring(0, 57).trim() + "...";
        }

        private String readString(Map<String, Object> data, String key) {
                Object value = data.get(key);
                return value == null ? "" : String.valueOf(value).trim();
        }

        private String defaultIfBlank(String value, String fallback) {
                return StringUtils.hasText(value) ? value.trim() : fallback;
        }

        private String firstNonBlank(String... values) {
                for (String value : values) {
                        if (StringUtils.hasText(value)) {
                                return value.trim();
                        }
                }
                return "";
        }

        private String normalizePart(String value) {
                return value == null ? "" : value.trim();
        }

        private String nullToEmpty(String value) {
                return value == null ? "" : value;
        }

        private String readScenarioString(Map<String, Object> scenarioData, String key) {
                if (scenarioData == null) {
                        return "";
                }
                Object value = scenarioData.get(key);
                return value == null ? "" : String.valueOf(value).trim();
        }

        private ExerciseSource resolveSource(ExerciseSource requested, ExerciseSource current) {
                if (requested != null) {
                        return requested;
                }
                if (current != null) {
                        return current;
                }
                return ExerciseSource.MANUAL;
        }

        private String resolveExerciseCode(String requested, String current, ExerciseSource source) {
                String trimmed = requested == null ? null : requested.trim();
                if (trimmed != null && !trimmed.isEmpty()) {
                        if (current == null || !trimmed.equals(current)) {
                                if (exerciseRepository.existsByExerciseCode(trimmed)) {
                                        throw new BadRequestException("Exercise code already exists");
                                }
                        }
                        return trimmed;
                }

                if (current != null && !current.isBlank()) {
                        return current;
                }

                return generateExerciseCode(source);
        }

        private User resolveOwnerStudent(
                        ExerciseSource source,
                        Long ownerStudentId,
                        User currentOwnerStudent) {
                if (source == ExerciseSource.MANUAL) {
                        if (ownerStudentId != null) {
                                throw new BadRequestException("Manual exercise must not have ownerStudent");
                        }
                        return null;
                }

                if (ownerStudentId == null) {
                        if (currentOwnerStudent != null) {
                                return currentOwnerStudent;
                        }
                        throw new BadRequestException("AI-generated exercise must have ownerStudent");
                }

                return userRepository.findById(ownerStudentId)
                                .orElseThrow(() -> new ResourceNotFoundException("Owner student not found"));
        }

    private Exercise resolveBaseExercise(
            ExerciseSource source,
            Long baseExerciseId,
            Exercise currentBaseExercise) {
        if (source == ExerciseSource.MANUAL) {
            if (baseExerciseId != null) {
                throw new BadRequestException("Manual exercise must not have baseExercise");
            }
            return null;
        }

        if (baseExerciseId == null) {
            return currentBaseExercise;
        }

        Exercise baseExercise = exerciseRepository.findById(baseExerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Base exercise not found"));
        ExerciseSource baseSource = baseExercise.getExerciseSource();
        if (baseSource != null && baseSource != ExerciseSource.MANUAL) {
            throw new BadRequestException("Base exercise must be MANUAL");
        }
        return baseExercise;
    }

        private String generateExerciseCode(ExerciseSource source) {
                String prefix = source == ExerciseSource.AI_GENERATED
                                ? "AI-" + DateTimeFormatter.BASIC_ISO_DATE.format(LocalDate.now()) + "-"
                                : "MANUAL-";

                for (int attempt = 0; attempt < 10; attempt++) {
                        String candidate = prefix + randomSuffix();
                        if (!exerciseRepository.existsByExerciseCode(candidate)) {
                                return candidate;
                        }
                }

                throw new IllegalStateException("Failed to generate unique exercise code");
        }

        private String randomSuffix() {
                StringBuilder builder = new StringBuilder(CODE_SUFFIX_LENGTH);
                for (int i = 0; i < CODE_SUFFIX_LENGTH; i++) {
                        int idx = secureRandom.nextInt(CODE_CHARS.length());
                        builder.append(CODE_CHARS.charAt(idx));
                }
                return builder.toString();
        }

        private record GeneratedExercise(String title, String description, Map<String, Object> scenarioData) {
        }
}
