package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.SubmissionRequest;
import com.dbdesignassitant.backend.dtos.response.AIEvaluationResponse;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.EvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionStatusResponse;
import com.dbdesignassitant.backend.services.SubmissionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentSubmissionController {

    private final SubmissionService submissionService;
    private final com.dbdesignassitant.backend.repositories.UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        org.springframework.security.core.userdetails.UserDetails userDetails = 
                (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal();
        com.dbdesignassitant.backend.entities.User user = userRepository.findByUserEmailAndIsActiveTrue(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getUserId();
    }

    @PostMapping("/exercises/{exerciseId}/submissions")
    public ResponseEntity<ApiResponse<SubmissionResponse>> createDraft(@PathVariable Long exerciseId) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.createDraft(currentUserId, exerciseId);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/submissions/{id}/draft")
    public ResponseEntity<ApiResponse<SubmissionResponse>> updateDraft(
            @PathVariable Long id,
            @RequestBody SubmissionRequest request) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.updateDraft(currentUserId, id, request);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/submissions/{id}/submit")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submit(
            @PathVariable Long id,
            @RequestBody(required = false) SubmissionRequest request) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.submit(currentUserId, id, request);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getStudentSubmissions(
            @RequestParam(defaultValue = "false") boolean archived) {
        Long currentUserId = getCurrentUserId();
        List<SubmissionResponse> data = submissionService.getStudentSubmissions(currentUserId, archived);
        ApiResponse<List<SubmissionResponse>> response = ApiResponse.<List<SubmissionResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getStudentSubmissionById(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.getStudentSubmissionById(currentUserId, id);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/submissions/{id}/archive")
    public ResponseEntity<ApiResponse<SubmissionResponse>> archiveStudentSubmission(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.setStudentSubmissionArchived(currentUserId, id, true);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/submissions/{id}/restore")
    public ResponseEntity<ApiResponse<SubmissionResponse>> restoreStudentSubmission(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        SubmissionResponse data = submissionService.setStudentSubmissionArchived(currentUserId, id, false);
        ApiResponse<SubmissionResponse> response = ApiResponse.<SubmissionResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions/{id}/status")
    public ResponseEntity<ApiResponse<SubmissionStatusResponse>> getStudentSubmissionStatus(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        SubmissionStatusResponse data = submissionService.getStudentSubmissionStatus(currentUserId, id);
        ApiResponse<SubmissionStatusResponse> response = ApiResponse.<SubmissionStatusResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions/{id}/evaluation")
    public ResponseEntity<ApiResponse<AIEvaluationResponse>> getStudentEvaluation(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        AIEvaluationResponse data = submissionService.getStudentEvaluationBySubmissionId(currentUserId, id);
        ApiResponse<AIEvaluationResponse> response = ApiResponse.<AIEvaluationResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions/{id}/evaluation-rounds")
    public ResponseEntity<ApiResponse<List<EvaluationRoundResponse>>> getStudentEvaluationRounds(@PathVariable Long id) {
        Long currentUserId = getCurrentUserId();
        List<EvaluationRoundResponse> data = submissionService.getStudentEvaluationRounds(currentUserId, id);
        ApiResponse<List<EvaluationRoundResponse>> response = ApiResponse.<List<EvaluationRoundResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
        return ResponseEntity.ok(response);
    }
}
