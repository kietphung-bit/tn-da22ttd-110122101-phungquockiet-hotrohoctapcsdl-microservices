package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.response.AdminPracticeInsightsResponse;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.PracticeInsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/practice-insights")
@RequiredArgsConstructor
public class AdminPracticeInsightsController {
    private final PracticeInsightsService practiceInsightsService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminPracticeInsightsResponse>> getPracticeInsights(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) SubmissionStatus roundStatus,
            @RequestParam(required = false) ExerciseSource exerciseSource,
            @RequestParam(required = false) Long exerciseId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) Boolean fallbackUsed) {
        AdminPracticeInsightsResponse data = practiceInsightsService.getAdminPracticeInsights(
                from,
                to,
                status,
                roundStatus,
                exerciseSource,
                exerciseId,
                studentId,
                provider,
                fallbackUsed);
        return ResponseEntity.ok(ApiResponse.<AdminPracticeInsightsResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
