package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.dtos.request.ExerciseGenerationRequest;
import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.dtos.response.KnowledgeRetrievalResult;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.KnowledgeRetrievalService;
import com.dbdesignassitant.backend.services.LlmClient;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceImplTest {

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private KnowledgeRetrievalService knowledgeRetrievalService;

    private AiProperties aiProperties;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        objectMapper = new ObjectMapper();
    }

    @Test
    void studentCreatesExerciseFromCustomPrompt() {
        LlmClient mockClient = client(AiProvider.MOCK);
        when(mockClient.isAvailable()).thenReturn(true);
        ExerciseServiceImpl service = newService(List.of(mockClient));
        User student = student(10L);
        String customPrompt = "Hay thiet ke CSDL cho he thong quan ly dat phong khach san";

        stubGenerationDependencies(student);
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            exercise.setExerciseId(123L);
            return exercise;
        });

        ExerciseGenerationResponse response = service.generateStudentExercise(ExerciseGenerationRequest.builder()
                .customPrompt(customPrompt)
                .difficulty("MEDIUM")
                .businessDomain("khach san")
                .additionalRequirements("Can quan ly phong, khach hang va dat phong.")
                .build());

        assertEquals(123L, response.getExerciseId());
        assertEquals(ExerciseSource.AI_GENERATED, response.getExerciseSource());
        assertEquals(student.getUserId(), response.getOwnerStudentId());

        ArgumentCaptor<Exercise> exerciseCaptor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository).save(exerciseCaptor.capture());
        Exercise savedExercise = exerciseCaptor.getValue();

        assertEquals(ExerciseSource.AI_GENERATED, savedExercise.getExerciseSource());
        assertEquals(student, savedExercise.getOwnerStudent());
        assertEquals(student, savedExercise.getCreatedBy());
        assertFalse(savedExercise.getIsPublished());
        assertNotNull(savedExercise.getScenarioData().get("requirements"));
        assertNotNull(savedExercise.getScenarioData().get("constraints"));
        assertEquals("CUSTOM_PROMPT", savedExercise.getScenarioData().get("generationInputType"));
        assertEquals(customPrompt, savedExercise.getScenarioData().get("studentPrompt"));

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        verify(knowledgeRetrievalService).retrieveTopK(queryCaptor.capture(), eq(3));
        assertTrue(queryCaptor.getValue().contains("dat phong khach san"));
    }

    @Test
    void providerFailureFallsBackToMockExercise() {
        aiProperties.setProvider(AiProvider.GEMINI);
        LlmClient gemini = client(AiProvider.GEMINI);
        when(gemini.isAvailable()).thenReturn(true);
        when(gemini.generate(anyString(), anyList()))
                .thenThrow(new IllegalStateException("provider failed"));
        ExerciseServiceImpl service = newService(List.of(gemini, client(AiProvider.MOCK)));
        User student = student(11L);

        stubGenerationDependencies(student);
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            exercise.setExerciseId(124L);
            return exercise;
        });

        ExerciseGenerationResponse response = service.generateStudentExercise(ExerciseGenerationRequest.builder()
                .customPrompt("Thiet ke CSDL cho he thong quan ly dat lich phong kham.")
                .difficulty("EASY")
                .build());

        assertEquals(124L, response.getExerciseId());
        assertEquals("MOCK", response.getScenarioData().get("generationMode"));
        assertEquals("CUSTOM_PROMPT", response.getScenarioData().get("generationInputType"));
        verify(gemini).generate(anyString(), anyList());
    }

    @Test
    void studentCannotReadAnotherStudentsAiGeneratedExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User currentStudent = student(21L);
        User otherStudent = student(22L);
        Exercise otherExercise = Exercise.builder()
                .exerciseId(55L)
                .exTitle("Private AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(otherStudent)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(currentStudent);
        when(exerciseRepository.findById(55L)).thenReturn(Optional.of(otherExercise));

        assertThrows(ResourceNotFoundException.class, () -> service.getStudentExerciseById(55L));
    }

    @Test
    void studentCannotReadPublishedManualExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User currentStudent = student(21L);
        Exercise manualExercise = Exercise.builder()
                .exerciseId(56L)
                .exTitle("Published manual")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(currentStudent);
        when(exerciseRepository.findById(56L)).thenReturn(Optional.of(manualExercise));

        assertThrows(BadRequestException.class, () -> service.getStudentExerciseById(56L));
    }

    @Test
    void activeStudentExerciseListOnlyShowsActiveOwnedAiExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(21L);
        Exercise manualExercise = Exercise.builder()
                .exerciseId(50L)
                .exTitle("Published manual")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of())
                .build();
        Exercise activeAiExercise = Exercise.builder()
                .exerciseId(51L)
                .exTitle("Active private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(false)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();
        Exercise archivedAiExercise = Exercise.builder()
                .exerciseId(52L)
                .exTitle("Archived private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(true)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findStudentVisibleExercises(eq(student.getUserId()), nullable(String.class), eq(false)))
                .thenReturn(List.of(manualExercise, activeAiExercise, archivedAiExercise));

        List<ExerciseResponse> responses = service.getStudentExercises(" ", false);

        assertEquals(1, responses.size());
        assertEquals(51L, responses.get(0).getExerciseId());
        assertFalse(responses.stream().anyMatch(response -> response.getExerciseId().equals(50L)));
        assertFalse(responses.stream().anyMatch(response -> response.getExerciseId().equals(52L)));
    }

    @Test
    void archivedStudentExerciseListOnlyShowsArchivedOwnedAiExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(21L);
        Exercise manualExercise = Exercise.builder()
                .exerciseId(60L)
                .exTitle("Published manual")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of())
                .build();
        Exercise activeAiExercise = Exercise.builder()
                .exerciseId(61L)
                .exTitle("Active private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(false)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();
        Exercise archivedAiExercise = Exercise.builder()
                .exerciseId(62L)
                .exTitle("Archived private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(true)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findStudentVisibleExercises(eq(student.getUserId()), nullable(String.class), eq(true)))
                .thenReturn(List.of(manualExercise, activeAiExercise, archivedAiExercise));

        List<ExerciseResponse> responses = service.getStudentExercises(null, true);

        assertEquals(1, responses.size());
        assertEquals(62L, responses.get(0).getExerciseId());
        assertTrue(Boolean.TRUE.equals(responses.get(0).getStudentArchived()));
    }

    @Test
    void studentCanArchiveOwnPrivateAiExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(21L);
        Exercise exercise = Exercise.builder()
                .exerciseId(70L)
                .exTitle("Private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(false)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findById(70L)).thenReturn(Optional.of(exercise));
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseResponse response = service.setStudentExerciseArchived(70L, true);

        assertTrue(Boolean.TRUE.equals(response.getStudentArchived()));
        assertNotNull(response.getStudentArchivedAt());
        assertTrue(Boolean.TRUE.equals(exercise.getStudentArchived()));
        assertNotNull(exercise.getStudentArchivedAt());
    }

    @Test
    void studentCanRestoreOwnPrivateAiExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(21L);
        Exercise exercise = Exercise.builder()
                .exerciseId(71L)
                .exTitle("Private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(student)
                .studentArchived(true)
                .studentArchivedAt(java.time.LocalDateTime.now())
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findById(71L)).thenReturn(Optional.of(exercise));
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseResponse response = service.setStudentExerciseArchived(71L, false);

        assertFalse(Boolean.TRUE.equals(response.getStudentArchived()));
        assertNull(response.getStudentArchivedAt());
        assertFalse(Boolean.TRUE.equals(exercise.getStudentArchived()));
        assertNull(exercise.getStudentArchivedAt());
    }

    @Test
    void studentCannotArchiveManualExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(21L);
        Exercise exercise = Exercise.builder()
                .exerciseId(72L)
                .exTitle("Published manual")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findById(72L)).thenReturn(Optional.of(exercise));

        assertThrows(BadRequestException.class, () -> service.setStudentExerciseArchived(72L, true));
    }

    @Test
    void studentCannotArchiveAnotherStudentsPrivateAiExercise() {
        ExerciseServiceImpl service = newService(List.of());
        User currentStudent = student(21L);
        User otherStudent = student(22L);
        Exercise exercise = Exercise.builder()
                .exerciseId(73L)
                .exTitle("Other private AI")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(otherStudent)
                .studentArchived(false)
                .isPublished(false)
                .scenarioData(Map.of())
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(currentStudent);
        when(exerciseRepository.findById(73L)).thenReturn(Optional.of(exercise));

        assertThrows(ResourceNotFoundException.class, () -> service.setStudentExerciseArchived(73L, true));
    }

    @Test
    void instructorGeneratedExerciseIsDraftUnpublishedAndNotStudentOwned() {
        LlmClient mockClient = client(AiProvider.MOCK);
        when(mockClient.isAvailable()).thenReturn(true);
        ExerciseServiceImpl service = newService(List.of(mockClient));
        User instructor = user(30L, "instructor");

        stubStaffGenerationDependencies();
        when(userRepository.findById(instructor.getUserId())).thenReturn(Optional.of(instructor));
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            exercise.setExerciseId(200L);
            return exercise;
        });

        ExerciseGenerationResponse response = service.generateInstructorExercise(
                instructor.getUserId(),
                ExerciseGenerationRequest.builder()
                        .customPrompt("Design a database for bookstore inventory")
                        .difficulty("MEDIUM")
                        .build());

        assertEquals(200L, response.getExerciseId());
        assertNull(response.getOwnerStudentId());

        ArgumentCaptor<Exercise> exerciseCaptor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository).save(exerciseCaptor.capture());
        Exercise savedExercise = exerciseCaptor.getValue();
        assertEquals(ExerciseSource.AI_GENERATED, savedExercise.getExerciseSource());
        assertEquals(instructor, savedExercise.getCreatedBy());
        assertNull(savedExercise.getOwnerStudent());
        assertFalse(savedExercise.getIsPublished());
        assertEquals("DRAFT", savedExercise.getScenarioData().get("reviewStatus"));
        assertEquals("INSTRUCTOR", savedExercise.getScenarioData().get("reviewSource"));
        assertEquals("AI_GENERATION_TRIAL", savedExercise.getScenarioData().get("reviewPurpose"));
        assertEquals(false, savedExercise.getScenarioData().get("approvedForGeneration"));
    }

    @Test
    void staffRegenerationFromRejectedTrialRecordsRevisionSource() {
        LlmClient mockClient = client(AiProvider.MOCK);
        when(mockClient.isAvailable()).thenReturn(true);
        ExerciseServiceImpl service = newService(List.of(mockClient));
        User instructor = user(30L, "instructor");
        Exercise baseExercise = Exercise.builder()
                .exerciseId(88L)
                .exTitle("Manual base")
                .exDescription("Base description")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of("businessContext", "Base context"))
                .build();
        Exercise rejectedTrial = Exercise.builder()
                .exerciseId(77L)
                .exTitle("Rejected trial")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .baseExercise(baseExercise)
                .isPublished(false)
                .scenarioData(Map.of("reviewStatus", "REJECTED", "rejectReason", "Too vague"))
                .build();

        when(knowledgeRetrievalService.retrieveTopK(anyString(), eq(3)))
                .thenReturn(KnowledgeRetrievalResult.builder()
                        .sources(List.of())
                        .build());
        when(exerciseRepository.existsByExerciseCode(anyString())).thenReturn(false);
        when(userRepository.findById(instructor.getUserId())).thenReturn(Optional.of(instructor));
        when(exerciseRepository.findById(baseExercise.getExerciseId())).thenReturn(Optional.of(baseExercise));
        when(exerciseRepository.findStaffAiTrialsByBaseExerciseId(baseExercise.getExerciseId()))
                .thenReturn(List.of(rejectedTrial));
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            exercise.setExerciseId(201L);
            return exercise;
        });

        service.generateInstructorExercise(
                instructor.getUserId(),
                ExerciseGenerationRequest.builder()
                        .baseExerciseId(baseExercise.getExerciseId())
                        .difficulty("MEDIUM")
                        .build());

        ArgumentCaptor<Exercise> exerciseCaptor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository).save(exerciseCaptor.capture());
        assertEquals(77L, exerciseCaptor.getValue().getScenarioData().get("revisionOfExerciseId"));
    }

    @Test
    void staffGeneratedExerciseMustBeApprovedBeforePublishing() {
        ExerciseServiceImpl service = newService(List.of());
        Exercise draftExercise = Exercise.builder()
                .exerciseId(201L)
                .exTitle("Draft AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .isPublished(false)
                .scenarioData(Map.of("reviewStatus", "DRAFT"))
                .build();

        when(exerciseRepository.findById(201L)).thenReturn(Optional.of(draftExercise));

        assertThrows(BadRequestException.class, () -> service.setExercisePublished(201L, true));
    }

    @Test
    void adminApproveTrialMarksBaseExerciseEligibleWithoutPublishingTrial() {
        ExerciseServiceImpl service = newService(List.of());
        User admin = user(1L, "admin");
        Exercise baseExercise = Exercise.builder()
                .exerciseId(99L)
                .exTitle("Manual base")
                .exerciseSource(ExerciseSource.MANUAL)
                .isPublished(true)
                .scenarioData(Map.of("businessContext", "Base context"))
                .build();
        Exercise draftExercise = Exercise.builder()
                .exerciseId(202L)
                .exTitle("Draft AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .baseExercise(baseExercise)
                .isPublished(false)
                .scenarioData(Map.of("reviewStatus", "DRAFT", "rejectReason", "Old reason"))
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(admin);
        when(exerciseRepository.findById(202L)).thenReturn(Optional.of(draftExercise));
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.approveAdminGeneratedExercise(202L, true);

        ArgumentCaptor<Exercise> exerciseCaptor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository, org.mockito.Mockito.times(2)).save(exerciseCaptor.capture());
        Exercise savedExercise = exerciseCaptor.getAllValues().get(1);
        assertFalse(savedExercise.getIsPublished());
        assertEquals("APPROVED", savedExercise.getScenarioData().get("reviewStatus"));
        assertEquals("AI_GENERATION_TRIAL", savedExercise.getScenarioData().get("reviewPurpose"));
        assertEquals(true, savedExercise.getScenarioData().get("approvedForGeneration"));
        assertFalse(savedExercise.getScenarioData().containsKey("rejectReason"));

        Object policyObject = baseExercise.getScenarioData().get("aiGenerationPolicy");
        assertTrue(policyObject instanceof Map<?, ?>);
        Map<?, ?> policy = (Map<?, ?>) policyObject;
        assertEquals(true, policy.get("enabled"));
        assertEquals(202L, policy.get("approvedTrialExerciseId"));
    }

    @Test
    void rejectingStaffTrialRequiresReason() {
        ExerciseServiceImpl service = newService(List.of());
        User admin = user(1L, "admin");
        Exercise draftExercise = Exercise.builder()
                .exerciseId(205L)
                .exTitle("Draft AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .isPublished(false)
                .scenarioData(Map.of("reviewStatus", "DRAFT"))
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(admin);
        when(exerciseRepository.findById(205L)).thenReturn(Optional.of(draftExercise));

        assertThrows(BadRequestException.class, () -> service.rejectAdminGeneratedExercise(205L, " "));
    }

    @Test
    void studentCannotReadApprovedPublishedStaffAiTrial() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(31L);
        Exercise publicAiExercise = Exercise.builder()
                .exerciseId(203L)
                .exTitle("Approved public AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .isPublished(true)
                .scenarioData(Map.of("reviewStatus", "APPROVED"))
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findById(203L)).thenReturn(Optional.of(publicAiExercise));

        assertThrows(ResourceNotFoundException.class, () -> service.getStudentExerciseById(203L));
    }

    @Test
    void studentCannotReadUnapprovedStaffAiExerciseEvenIfPublishedFlagIsTrue() {
        ExerciseServiceImpl service = newService(List.of());
        User student = student(32L);
        Exercise publicAiExercise = Exercise.builder()
                .exerciseId(204L)
                .exTitle("Unapproved public AI exercise")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudent(null)
                .isPublished(true)
                .scenarioData(Map.of("reviewStatus", "REJECTED"))
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        when(exerciseRepository.findById(204L)).thenReturn(Optional.of(publicAiExercise));

        assertThrows(ResourceNotFoundException.class, () -> service.getStudentExerciseById(204L));
    }

    private ExerciseServiceImpl newService(List<LlmClient> clients) {
        return new ExerciseServiceImpl(
                exerciseRepository,
                userRepository,
                currentUserProvider,
                knowledgeRetrievalService,
                clients,
                aiProperties,
                objectMapper);
    }

    private void stubGenerationDependencies(User student) {
        when(currentUserProvider.getCurrentUser()).thenReturn(student);
        stubStaffGenerationDependencies();
    }

    private void stubStaffGenerationDependencies() {
        when(exerciseRepository.findPublishedManualExercisesForGeneration(nullable(String.class)))
                .thenReturn(List.of());
        when(knowledgeRetrievalService.retrieveTopK(anyString(), eq(3)))
                .thenReturn(KnowledgeRetrievalResult.builder()
                        .sources(List.of())
                        .build());
        when(exerciseRepository.existsByExerciseCode(anyString())).thenReturn(false);
    }

    private LlmClient client(AiProvider provider) {
        LlmClient client = mock(LlmClient.class);
        when(client.provider()).thenReturn(provider);
        return client;
    }

    private User student(Long id) {
        return user(id, "student");
    }

    private User user(Long id, String prefix) {
        return User.builder()
                .userId(id)
                .userEmail(prefix + "-" + id + "@dbdesign.local")
                .fullName(prefix + " " + id)
                .isActive(true)
                .build();
    }
}
