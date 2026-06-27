package com.dbdesignassitant.backend.controllers;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.SubmissionService;
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

@SpringBootTest(properties = "app.seed.enabled=false")
@AutoConfigureMockMvc
class AdminEvaluationRoundControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SubmissionService submissionService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanReadEvaluationRounds() throws Exception {
        when(submissionService.getAdminEvaluationRounds(
                eq(SubmissionStatus.FAILED),
                isNull(),
                isNull(),
                isNull(),
                isNull()))
                .thenReturn(List.of(AdminEvaluationRoundResponse.builder()
                        .roundId(101L)
                        .submissionId(10L)
                        .studentId(2L)
                        .studentName("Student")
                        .studentEmail("student@dbdesign.local")
                        .roundNumber(2)
                        .roundStatus(SubmissionStatus.FAILED)
                        .overallScore(BigDecimal.ZERO)
                        .provider("MOCK")
                        .model("mock-rule-based")
                        .fallbackUsed(true)
                        .fallbackFrom("GEMINI")
                        .submittedAt(LocalDateTime.now())
                        .gradedAt(null)
                        .build()));

        mockMvc.perform(get("/api/admin/evaluation-rounds")
                        .param("status", "FAILED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].roundId").value(101))
                .andExpect(jsonPath("$.data[0].submissionId").value(10))
                .andExpect(jsonPath("$.data[0].fallbackUsed").value(true));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentCannotReadEvaluationRounds() throws Exception {
        mockMvc.perform(get("/api/admin/evaluation-rounds")
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "INSTRUCTOR")
    void instructorCannotReadEvaluationRounds() throws Exception {
        mockMvc.perform(get("/api/admin/evaluation-rounds")
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
    }
}
