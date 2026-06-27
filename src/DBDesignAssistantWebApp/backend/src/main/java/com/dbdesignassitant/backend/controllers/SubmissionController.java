package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.response.AIEvaluationResponse;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionResponse;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.services.SubmissionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    /**
     * GET /api/submissions
     * Optional filters: status, exerciseId, userId
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getSubmissions(
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) Long exerciseId,
            @RequestParam(required = false) Long userId) {

        List<SubmissionResponse> data = submissionService.getSubmissions(status, exerciseId, userId);
        return ResponseEntity.ok(ApiResponse.<List<SubmissionResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    /**
     * GET /api/submissions/{id}
     * Returns submission detail including evaluation (if available)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionById(@PathVariable Long id) {
        SubmissionResponse data = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    /**
     * GET /api/submissions/{id}/evaluation
     * Returns the AIEvaluation + EvaluationDetails for a submission
     */
    @GetMapping("/{id}/evaluation")
    public ResponseEntity<ApiResponse<AIEvaluationResponse>> getEvaluation(@PathVariable Long id) {
        AIEvaluationResponse data = submissionService.getEvaluationBySubmissionId(id);
        return ResponseEntity.ok(ApiResponse.<AIEvaluationResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
