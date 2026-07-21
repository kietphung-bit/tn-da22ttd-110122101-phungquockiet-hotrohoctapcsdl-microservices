package com.dbdesignassitant.backend.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dbdesignassitant.backend.dtos.response.ExerciseGenerationResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.services.ExerciseService;
import java.util.List;
import java.util.Map;
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
class StudentExerciseControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExerciseService exerciseService;

    @Test
    void unauthenticatedCannotGenerateStudentExercise() throws Exception {
        mockMvc.perform(post("/api/student/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design a hotel booking database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentGenerateEndpointReturnsApiResponseWrapper() throws Exception {
        when(exerciseService.generateStudentExercise(any()))
                .thenReturn(ExerciseGenerationResponse.builder()
                        .exerciseId(99L)
                        .exerciseCode("AI-20260702-ABC123")
                        .title("Hotel booking ERD")
                        .description("Design a hotel booking database.")
                        .scenarioData(Map.of(
                                "businessContext", "Hotel booking",
                                "requirements", List.of("Manage rooms and bookings"),
                                "constraints", List.of("Booking must reference a room"),
                                "difficulty", "MEDIUM"))
                        .exerciseSource(ExerciseSource.AI_GENERATED)
                        .ownerStudentId(7L)
                        .build());

        mockMvc.perform(post("/api/student/exercises/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customPrompt": "Design a hotel booking database",
                                  "difficulty": "MEDIUM"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.exerciseId").value(99))
                .andExpect(jsonPath("$.data.exerciseSource").value("AI_GENERATED"));
    }
}
