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
                exercise.setIsPublished(isPublished);
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
        }

        // --- Student Methods ---
        @Override
        @Transactional(readOnly = true)
        public List<ExerciseResponse> getStudentExercises(String search) {
                String normalizedSearch = search == null ? null : search.trim();
                if (normalizedSearch != null && normalizedSearch.isEmpty()) {
                        normalizedSearch = null;
                }
                User currentUser = currentUserProvider.getCurrentUser();
                return exerciseRepository.findStudentVisibleExercises(currentUser.getUserId(), normalizedSearch).stream()
                                .map(ResponseMapper::toExerciseResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public ExerciseResponse getStudentExerciseById(Long exerciseId) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise exercise = exerciseRepository.findById(exerciseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
                
                boolean availableManual = exercise.getExerciseSource() == ExerciseSource.MANUAL
                                && Boolean.TRUE.equals(exercise.getIsPublished());
                boolean ownedAi = exercise.getExerciseSource() == ExerciseSource.AI_GENERATED
                                && exercise.getOwnerStudent() != null
                                && exercise.getOwnerStudent().getUserId().equals(currentUser.getUserId());
                if (!availableManual && !ownedAi) {
                        throw new ResourceNotFoundException("Exercise not found");
                }
                return ResponseMapper.toExerciseResponse(exercise);
        }

        @Override
        @Transactional
        public ExerciseGenerationResponse generateStudentExercise(ExerciseGenerationRequest request) {
                User currentUser = currentUserProvider.getCurrentUser();
                Exercise baseExercise = resolveGenerationBaseExercise(request.getBaseExerciseId());
                List<Exercise> sampleExercises = resolveGenerationSampleExercises(request, baseExercise);
                List<RetrievedKnowledgeResponse> knowledgeSources = retrieveGenerationKnowledge(request);
                String prompt = buildExerciseGenerationPrompt(request, sampleExercises, knowledgeSources);

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
                exercise.setIsPublished(isPublished);
                return ResponseMapper.toExerciseResponse(exerciseRepository.save(exercise));
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
                                normalizePart(request.getTopic()),
                                normalizePart(request.getDifficulty()),
                                normalizePart(request.getBusinessDomain()),
                                normalizePart(request.getKeywords()),
                                normalizePart(request.getAdditionalRequirements()))
                                .trim();
                int topK = Math.max(1, aiProperties.getRag().getTopK());
                KnowledgeRetrievalResult result = knowledgeRetrievalService.retrieveTopK(query, topK);
                return result.getSources() == null ? List.of() : result.getSources();
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

                Map<String, Object> scenarioData = new LinkedHashMap<>(parsed);
                scenarioData.putIfAbsent("difficulty", normalizePart(request.getDifficulty()));
                scenarioData.putIfAbsent("topic", normalizePart(request.getTopic()));
                scenarioData.putIfAbsent("businessDomain", normalizePart(request.getBusinessDomain()));
                scenarioData.put("generationMode", "LLM");
                scenarioData.remove("sampleSolution");
                scenarioData.remove("sampleSolutions");
                scenarioData.remove("solutionData");
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
                String topic = defaultIfBlank(request.getTopic(), "thiet ke co so du lieu");
                String difficulty = defaultIfBlank(request.getDifficulty(), "MEDIUM");
                String domain = defaultIfBlank(request.getBusinessDomain(), "thu vien so");
                String title = "Bai tap thiet ke CSDL - " + domain;
                String description = "Hay phan tich boi canh " + domain
                                + " va thiet ke mo hinh du lieu dap ung cac yeu cau nghiep vu da cho.";

                Map<String, Object> scenarioData = new LinkedHashMap<>();
                scenarioData.put("title", title);
                scenarioData.put("description", description);
                scenarioData.put("topic", topic);
                scenarioData.put("difficulty", difficulty);
                scenarioData.put("businessDomain", domain);
                scenarioData.put("businessContext",
                                "Mot don vi van hanh " + domain
                                                + " can quan ly nguoi dung, tai nguyen, giao dich va lich su xu ly.");
                scenarioData.put("functionalRequirements", List.of(
                                "Quan ly ho so nguoi dung va trang thai tai khoan.",
                                "Quan ly danh muc tai nguyen/chuc nang chinh cua mien nghiep vu.",
                                "Ghi nhan giao dich phat sinh va truy vet lich su thay doi."));
                scenarioData.put("dataConstraints", List.of(
                                "Moi ban ghi chinh can co khoa dinh danh duy nhat.",
                                "Thong tin giao dich phai tham chieu den nguoi dung va doi tuong nghiep vu hop le.",
                                "Trang thai nghiep vu chi duoc nhan cac gia tri hop le theo vong doi xu ly."));
                scenarioData.put("designScopeHints", List.of(
                                "Xac dinh cac thuc the trung tam, thuoc tinh bat buoc va khoa chinh.",
                                "Mo ta quan he va cardinality giua nguoi dung, tai nguyen va giao dich.",
                                "Can nhac cac bang trung gian neu co quan he nhieu-nhieu."));
                scenarioData.put("keywords", normalizePart(request.getKeywords()));
                scenarioData.put("additionalRequirements", normalizePart(request.getAdditionalRequirements()));
                scenarioData.put("generationMode", "MOCK");
                return new GeneratedExercise(title, description, scenarioData);
        }

        private String buildExerciseGenerationPrompt(
                        ExerciseGenerationRequest request,
                        List<Exercise> sampleExercises,
                        List<RetrievedKnowledgeResponse> knowledgeSources) {
                StringBuilder builder = new StringBuilder();
                builder.append("Ban la chuyen gia tao de bai thuc hanh thiet ke co so du lieu cho sinh vien.\n");
                builder.append("Chi tao DE BAI, tuyet doi khong dua loi giai, dap an mau, SampleSolution, SQL DDL hoan chinh.\n");
                builder.append("Tra ve dung mot JSON object, khong markdown, khong giai thich ngoai JSON.\n");
                builder.append("JSON bat buoc co cac truong: title, description, businessContext, functionalRequirements, dataConstraints, designScopeHints, difficulty.\n");
                builder.append("functionalRequirements, dataConstraints, designScopeHints la mang string.\n\n");
                builder.append("YEU_CAU_SINH_VIEN:\n");
                builder.append("topic: ").append(normalizePart(request.getTopic())).append("\n");
                builder.append("difficulty: ").append(normalizePart(request.getDifficulty())).append("\n");
                builder.append("businessDomain: ").append(normalizePart(request.getBusinessDomain())).append("\n");
                builder.append("keywords: ").append(normalizePart(request.getKeywords())).append("\n");
                builder.append("additionalRequirements: ").append(normalizePart(request.getAdditionalRequirements())).append("\n\n");
                builder.append("BAI_MAU_CONTEXT_KHONG_LO_SOLUTION:\n");
                if (sampleExercises.isEmpty()) {
                        builder.append("(Khong co bai mau phu hop.)\n\n");
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
                builder.append("KNOWLEDGE_BASE_APPROVED_CONTEXT:\n");
                if (knowledgeSources.isEmpty()) {
                        builder.append("(Khong co hoc lieu APPROVED phu hop.)\n");
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
                                .build();
        }

        private String buildSampleSearch(ExerciseGenerationRequest request) {
                List<String> parts = new ArrayList<>();
                if (StringUtils.hasText(request.getTopic())) {
                        parts.add(request.getTopic().trim());
                }
                if (StringUtils.hasText(request.getBusinessDomain())) {
                        parts.add(request.getBusinessDomain().trim());
                }
                if (StringUtils.hasText(request.getKeywords())) {
                        parts.add(request.getKeywords().trim());
                }
                return parts.isEmpty() ? null : parts.get(0);
        }

        private String readString(Map<String, Object> data, String key) {
                Object value = data.get(key);
                return value == null ? "" : String.valueOf(value).trim();
        }

        private String defaultIfBlank(String value, String fallback) {
                return StringUtils.hasText(value) ? value.trim() : fallback;
        }

        private String normalizePart(String value) {
                return value == null ? "" : value.trim();
        }

        private String nullToEmpty(String value) {
                return value == null ? "" : value;
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
