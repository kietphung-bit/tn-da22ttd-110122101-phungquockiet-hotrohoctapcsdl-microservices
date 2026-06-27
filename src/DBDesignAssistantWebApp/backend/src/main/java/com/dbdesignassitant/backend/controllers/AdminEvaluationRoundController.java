package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.SubmissionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/evaluation-rounds")
@RequiredArgsConstructor
public class AdminEvaluationRoundController {

    private final SubmissionService submissionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminEvaluationRoundResponse>>> getEvaluationRounds(
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) Boolean fallbackUsed,
            @RequestParam(required = false) Long submissionId,
            @RequestParam(required = false) Long studentId) {

        List<AdminEvaluationRoundResponse> data = submissionService.getAdminEvaluationRounds(
                status,
                provider,
                fallbackUsed,
                submissionId,
                studentId);
        return ResponseEntity.ok(ApiResponse.<List<AdminEvaluationRoundResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
