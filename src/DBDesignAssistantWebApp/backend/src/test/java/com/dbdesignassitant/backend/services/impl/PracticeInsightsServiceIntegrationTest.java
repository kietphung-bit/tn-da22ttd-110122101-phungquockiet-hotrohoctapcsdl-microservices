package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.dbdesignassitant.backend.dtos.response.AdminPracticeInsightsResponse;
import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.entities.EvaluationRound;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.repositories.EvaluationRoundRepository;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.PracticeInsightsService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.seed.enabled=false")
@Transactional
class PracticeInsightsServiceIntegrationTest {

    @Autowired
    private PracticeInsightsService practiceInsightsService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private EvaluationRoundRepository evaluationRoundRepository;

    @Test
    void adminAndInstructorPracticeInsightsQueriesRunAgainstPostgres() {
        long unique = System.nanoTime();
        Role instructorRole = role(RoleName.INSTRUCTOR);
        Role studentRole = role(RoleName.STUDENT);
        User instructor = user("insight-instructor-" + unique + "@dbdesign.local", "Instructor", instructorRole);
        User student = user("insight-student-" + unique + "@dbdesign.local", "Student", studentRole);

        Exercise manualExercise = exerciseRepository.save(Exercise.builder()
                .exTitle("Practice Insight Manual " + unique)
                .exDescription("Manual exercise for insight integration test")
                .exerciseSource(ExerciseSource.MANUAL)
                .exerciseCode("INSIGHT-MANUAL-" + unique)
                .scenarioData(Map.<String, Object>of("requirements", List.of("Design a library ERD")))
                .createdBy(instructor)
                .isPublished(true)
                .build());
        Exercise derivedExercise = exerciseRepository.save(Exercise.builder()
                .exTitle("Practice Insight AI " + unique)
                .exDescription("Derived AI exercise for insight integration test")
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .exerciseCode("INSIGHT-AI-" + unique)
                .scenarioData(Map.<String, Object>of("requirements", List.of("Design a store ERD")))
                .createdBy(student)
                .ownerStudent(student)
                .baseExercise(manualExercise)
                .isPublished(false)
                .build());

        Submission directSubmission = submission(student, manualExercise, SubmissionStatus.GRADED);
        Submission derivedSubmission = submission(student, derivedExercise, SubmissionStatus.GRADED);
        round(directSubmission, 1, BigDecimal.valueOf(85));
        round(derivedSubmission, 1, BigDecimal.valueOf(75));

        AdminPracticeInsightsResponse adminResponse = practiceInsightsService.getAdminPracticeInsights(
                null,
                null,
                null,
                null,
                null,
                manualExercise.getExerciseId(),
                null,
                null,
                null);

        assertEquals(1L, adminResponse.getSummary().getTotalSubmissions());
        assertEquals(1L, adminResponse.getSummary().getTotalRounds());
        assertEquals("SUBMITTED_AT", adminResponse.getTrendDateSource());
        assertEquals(1L, adminResponse.getScoreDistribution().stream()
                .filter(item -> "80-89".equals(item.getBucket()))
                .findFirst()
                .orElseThrow()
                .getRoundCount());
        assertEquals(1L, adminResponse.getRoundDistribution().stream()
                .filter(item -> Integer.valueOf(1).equals(item.getRoundNumber()))
                .findFirst()
                .orElseThrow()
                .getRoundCount());
        assertFalse(adminResponse.getTrend().isEmpty());
        assertFalse(adminResponse.getTopIssueTypes().isEmpty());
        assertEquals("MISSING_PRIMARY_KEY", adminResponse.getTopIssueTypes().get(0).getErrorType());
        assertEquals(1L, adminResponse.getTopIssueTypes().get(0).getAffectedRoundCount());
        assertEquals("ATTRIBUTE_AND_KEY", adminResponse.getSkillAnalytics().get(0).getSkillCode());
        assertEquals(1L, adminResponse.getSkillAnalytics().get(0).getIssueCount());
        assertEquals(1L, adminResponse.getSkillAnalytics().get(0).getAffectedRoundCount());
        assertEquals(1L, adminResponse.getSkillAnalytics().get(0).getAffectedSubmissionCount());

        InstructorExerciseInsightsResponse instructorResponse = practiceInsightsService.getInstructorExerciseInsights(
                instructor.getUserId(),
                manualExercise.getExerciseId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                PracticeInsightsScope.ALL);

        assertEquals(1L, instructorResponse.getSummary().getDirectSubmissionCount());
        assertEquals(1L, instructorResponse.getSummary().getDerivedSubmissionCount());
        assertEquals(1L, instructorResponse.getSummary().getParticipantCount());
        assertEquals(2L, instructorResponse.getSummary().getTotalRounds());
        assertEquals("SUBMITTED_AT", instructorResponse.getTrendDateSource());
        assertEquals(1L, instructorResponse.getScoreDistribution().stream()
                .filter(item -> "65-79".equals(item.getBucket()))
                .findFirst()
                .orElseThrow()
                .getRoundCount());
        assertEquals(1L, instructorResponse.getScoreDistribution().stream()
                .filter(item -> "80-89".equals(item.getBucket()))
                .findFirst()
                .orElseThrow()
                .getRoundCount());
        assertEquals(2L, instructorResponse.getRoundDistribution().stream()
                .filter(item -> Integer.valueOf(1).equals(item.getRoundNumber()))
                .findFirst()
                .orElseThrow()
                .getRoundCount());
        assertFalse(instructorResponse.getTrend().isEmpty());
        assertEquals(2L, instructorResponse.getTopIssueTypes().get(0).getAffectedSubmissionCount());
        assertEquals(2L, instructorResponse.getTopIssueTypes().get(0).getAffectedRoundCount());
        assertEquals("ATTRIBUTE_AND_KEY", instructorResponse.getSkillAnalytics().get(0).getSkillCode());
        assertEquals(2L, instructorResponse.getSkillAnalytics().get(0).getIssueCount());
        assertEquals(2L, instructorResponse.getSkillAnalytics().get(0).getAffectedSubmissionCount());
        assertEquals(2L, instructorResponse.getSkillAnalytics().get(0).getAffectedRoundCount());
        assertEquals(2, instructorResponse.getAnonymizedSubmissionSummaries().size());
    }

    private Role role(RoleName roleName) {
        return roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .roleName(roleName)
                        .build()));
    }

    private User user(String email, String fullName, Role role) {
        return userRepository.save(User.builder()
                .userEmail(email)
                .passwordHash("hash")
                .fullName(fullName)
                .role(role)
                .isActive(true)
                .build());
    }

    private Submission submission(User student, Exercise exercise, SubmissionStatus status) {
        return submissionRepository.save(Submission.builder()
                .user(student)
                .exercise(exercise)
                .diagramData(Map.<String, Object>of("entities", List.of()))
                .submissionStatus(status)
                .submittedAt(LocalDateTime.now())
                .build());
    }

    private EvaluationRound round(Submission submission, int roundNumber, BigDecimal score) {
        return evaluationRoundRepository.save(EvaluationRound.builder()
                .submission(submission)
                .roundNumber(roundNumber)
                .diagramDataSnapshot(Map.<String, Object>of("entities", List.of()))
                .roundStatus(SubmissionStatus.GRADED)
                .overallScore(score)
                .provider("MOCK")
                .model("mock-rule-based")
                .fallbackUsed(false)
                .submittedAt(LocalDateTime.now())
                .gradedAt(LocalDateTime.now())
                .detailsSnapshot(List.of(Map.<String, Object>of(
                        "errorType", "MISSING_PRIMARY_KEY",
                        "evaDescription", "Add a primary key.",
                        "errorLocation", "Entity: Book")))
                .build());
    }
}
