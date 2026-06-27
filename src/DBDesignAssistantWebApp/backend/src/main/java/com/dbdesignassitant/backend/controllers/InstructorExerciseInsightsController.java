package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.InstructorExerciseInsightsResponse;
import com.dbdesignassitant.backend.enums.PracticeInsightsScope;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.PracticeInsightsService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor/exercises")
@RequiredArgsConstructor
public class InstructorExerciseInsightsController {
    private final PracticeInsightsService practiceInsightsService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/{exerciseId}/insights")
    public ResponseEntity<ApiResponse<InstructorExerciseInsightsResponse>> getExerciseInsights(
            @PathVariable Long exerciseId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) SubmissionStatus submissionStatus,
            @RequestParam(required = false) SubmissionStatus roundStatus,
            @RequestParam(required = false) Integer roundNumber,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) Boolean fallbackUsed,
            @RequestParam(required = false, defaultValue = "ALL") PracticeInsightsScope scope) {
        InstructorExerciseInsightsResponse data = practiceInsightsService.getInstructorExerciseInsights(
                currentUserProvider.getCurrentUserId(),
                exerciseId,
                from,
                to,
                submissionStatus,
                roundStatus,
                roundNumber,
                provider,
                fallbackUsed,
                scope);
        return ResponseEntity.ok(ApiResponse.<InstructorExerciseInsightsResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
