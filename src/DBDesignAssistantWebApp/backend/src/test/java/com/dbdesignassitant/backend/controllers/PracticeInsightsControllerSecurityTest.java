package com.dbdesignassitant.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.AdminPracticeInsightsResponse;
import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.PracticeInsightsService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "app.seed.enabled=false")
@AutoConfigureMockMvc
class PracticeInsightsControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PracticeInsightsService practiceInsightsService;

    @MockitoBean
    private CurrentUserProvider currentUserProvider;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanReadPracticeInsights() throws Exception {
        when(practiceInsightsService.getAdminPracticeInsights(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull()))
                .thenReturn(AdminPracticeInsightsResponse.builder()
                        .summary(AdminPracticeInsightsResponse.Summary.builder()
                                .totalSubmissions(2L)
                                .totalStudents(1L)
                                .totalExercises(1L)
                                .totalRounds(3L)
                                .gradedRounds(2L)
                                .failedRounds(1L)
                                .processingRounds(0L)
                                .averageScore(BigDecimal.valueOf(81.5))
                                .completionRate(BigDecimal.valueOf(0.6667))
                                .failureRate(BigDecimal.valueOf(0.3333))
                                .fallbackRate(BigDecimal.ZERO)
                                .build())
                        .statusBreakdown(List.of(AdminPracticeInsightsResponse.StatusBreakdownItem.builder()
                                .status(SubmissionStatus.GRADED)
                                .count(2L)
                                .build()))
                        .providerBreakdown(List.of())
                        .topIssueTypes(List.of())
                        .recentRounds(List.of(AdminEvaluationRoundResponse.builder()
                                .roundId(101L)
                                .submissionId(10L)
                                .studentId(5L)
                                .roundNumber(1)
                                .roundStatus(SubmissionStatus.GRADED)
                                .overallScore(BigDecimal.valueOf(82))
                                .provider("MOCK")
                                .submittedAt(LocalDateTime.now())
                                .build()))
                        .build());

        mockMvc.perform(get("/api/admin/practice-insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalSubmissions").value(2))
                .andExpect(jsonPath("$.data.recentRounds[0].roundId").value(101));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentCannotReadAdminPracticeInsights() throws Exception {
        mockMvc.perform(get("/api/admin/practice-insights"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "INSTRUCTOR")
    void instructorCannotReadAdminPracticeInsights() throws Exception {
        mockMvc.perform(get("/api/admin/practice-insights"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "INSTRUCTOR")
    void instructorCanReadOwnExerciseInsightsWithoutPrivateFields() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(7L);
        when(practiceInsightsService.getInstructorExerciseInsights(
                eq(7L),
                eq(100L),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                eq(PracticeInsightsScope.ALL)))
                .thenReturn(InstructorExerciseInsightsResponse.builder()
                        .exercise(InstructorExerciseInsightsResponse.ExerciseSummary.builder()
                                .exerciseId(100L)
                                .exerciseCode("MANUAL-100")
                                .exerciseTitle("Library ERD")
                                .exerciseSource(ExerciseSource.MANUAL)
                                .isPublished(true)
                                .build())
                        .scope(InstructorExerciseInsightsResponse.ScopeSummary.builder()
                                .selectedScope(PracticeInsightsScope.ALL)
                                .directExerciseId(100L)
                                .derivedAiExerciseCount(1L)
                                .includedSubmissionCount(1L)
                                .build())
                        .summary(InstructorExerciseInsightsResponse.Summary.builder()
                                .directSubmissionCount(1L)
                                .derivedAiExerciseCount(1L)
                                .derivedSubmissionCount(0L)
                                .participantCount(1L)
                                .gradedCount(1L)
                                .failedCount(0L)
                                .processingCount(0L)
                                .totalRounds(1L)
                                .averageScore(BigDecimal.valueOf(90))
                                .fallbackRate(BigDecimal.ZERO)
                                .build())
                        .topIssueTypes(List.of())
                        .anonymizedSubmissionSummaries(List.of(
                                InstructorExerciseInsightsResponse.AnonymizedSubmissionSummary.builder()
                                        .submissionId(200L)
                                        .exerciseScope(PracticeInsightsScope.DIRECT)
                                        .submissionStatus(SubmissionStatus.GRADED)
                                        .roundsUsed(1)
                                        .latestRoundStatus(SubmissionStatus.GRADED)
                                        .latestScore(BigDecimal.valueOf(90))
                                        .submittedAt(LocalDateTime.now())
                                        .gradedAt(LocalDateTime.now())
                                        .build()))
                        .build());

        MvcResult result = mockMvc.perform(get("/api/instructor/exercises/100/insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exercise.exerciseId").value(100))
                .andExpect(jsonPath("$.data.summary.participantCount").value(1))
                .andExpect(jsonPath("$.data.anonymizedSubmissionSummaries[0].submissionId").value(200))
                .andReturn();

        String json = result.getResponse().getContentAsString();
        assertFalse(json.contains("studentEmail"));
        assertFalse(json.contains("studentName"));
        assertFalse(json.contains("userEmail"));
        assertFalse(json.contains("fullName"));
        assertFalse(json.contains("diagramData"));
        assertFalse(json.contains("diagramDataSnapshot"));
        assertFalse(json.contains("detailsSnapshot"));
        assertFalse(json.contains("providerError"));
        assertFalse(json.contains("deadLetter"));
    }
}
