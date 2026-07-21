package com.dbdesignassitant.backend.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.dtos.response.ExerciseResponse;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.ExerciseService;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.seed.enabled=false")
@AutoConfigureMockMvc
class ExerciseReviewControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExerciseService exerciseService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanGenerateStaffAiExercise() throws Exception {
        when(exerciseService.generateAdminExercise(any()))
                .thenReturn(generationResponse(300L, "DRAFT"));

        mockMvc.perform(post("/api/admin/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design an inventory database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.exerciseId").value(300))
                .andExpect(jsonPath("$.data.ownerStudentId").isEmpty())
                .andExpect(jsonPath("$.data.scenarioData.reviewStatus").value("DRAFT"));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentCannotCallAdminGenerateEndpoint() throws Exception {
        mockMvc.perform(post("/api/admin/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design an inventory database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "instructor@dbdesign.local", roles = "INSTRUCTOR")
    void instructorCanGenerateAndApproveOwnStaffAiExercise() throws Exception {
        when(userRepository.findByUserEmailAndIsActiveTrue("instructor@dbdesign.local"))
                .thenReturn(Optional.of(User.builder()
                        .userId(40L)
                        .userEmail("instructor@dbdesign.local")
                        .fullName("Instructor")
                        .isActive(true)
                        .build()));
        when(exerciseService.generateInstructorExercise(eq(40L), any()))
                .thenReturn(generationResponse(301L, "DRAFT"));
        when(exerciseService.approveInstructorGeneratedExercise(40L, 301L, false))
                .thenReturn(exerciseResponse(301L, "APPROVED", false));

        mockMvc.perform(post("/api/instructor/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design a clinic appointment database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.exerciseId").value(301))
                .andExpect(jsonPath("$.data.scenarioData.reviewStatus").value("DRAFT"));

        mockMvc.perform(put("/api/instructor/exercises/301/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "publish": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exerciseId").value(301))
                .andExpect(jsonPath("$.data.isPublished").value(false))
                .andExpect(jsonPath("$.data.scenarioData.reviewStatus").value("APPROVED"));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentCannotCallInstructorGenerateEndpoint() throws Exception {
        mockMvc.perform(post("/api/instructor/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design an inventory database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private ExerciseGenerationResponse generationResponse(Long id, String reviewStatus) {
        return ExerciseGenerationResponse.builder()
                .exerciseId(id)
                .exerciseCode("AI-20260703-ABC123")
                .title("Generated exercise")
                .description("Generated description")
                .scenarioData(Map.of("reviewStatus", reviewStatus, "businessContext", "Context"))
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .ownerStudentId(null)
                .build();
    }

    private ExerciseResponse exerciseResponse(Long id, String reviewStatus, boolean published) {
        return ExerciseResponse.builder()
                .exerciseId(id)
                .exTitle("Generated exercise")
                .exDescription("Generated description")
                .scenarioData(Map.of("reviewStatus", reviewStatus, "businessContext", "Context"))
                .exerciseSource(ExerciseSource.AI_GENERATED)
                .exerciseCode("AI-20260703-ABC123")
                .isPublished(published)
                .build();
    }
}
