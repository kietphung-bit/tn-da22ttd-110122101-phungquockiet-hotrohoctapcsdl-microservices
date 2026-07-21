package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.AIEvaluationResponse;
import com.dbdesignassitant.backend.dtos.request.SubmissionRequest;
import com.dbdesignassitant.backend.dtos.response.AdminEvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.EvaluationRoundResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionStatusResponse;
import com.dbdesignassitant.backend.dtos.response.SubmissionResponse;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.util.List;

public interface SubmissionService {
    List<SubmissionResponse> getSubmissions(SubmissionStatus status, Long exerciseId, Long userId);
    SubmissionResponse getSubmissionById(Long id);
    AIEvaluationResponse getEvaluationBySubmissionId(Long submissionId);
    List<AdminEvaluationRoundResponse> getAdminEvaluationRounds(
            SubmissionStatus status,
            String provider,
            Boolean fallbackUsed,
            Long submissionId,
            Long studentId);

    // Student Methods
    SubmissionResponse createDraft(Long userId, Long exerciseId);
    SubmissionResponse updateDraft(Long userId, Long submissionId, com.dbdesignassitant.backend.dtos.request.SubmissionRequest request);
    SubmissionResponse submit(Long userId, Long submissionId, SubmissionRequest request);
    List<SubmissionResponse> getStudentSubmissions(Long userId, boolean archived);
    SubmissionResponse getStudentSubmissionById(Long userId, Long submissionId);
    SubmissionResponse setStudentSubmissionArchived(Long userId, Long submissionId, boolean archived);
    SubmissionStatusResponse getStudentSubmissionStatus(Long userId, Long submissionId);
    AIEvaluationResponse getStudentEvaluationBySubmissionId(Long userId, Long submissionId);
    List<EvaluationRoundResponse> getStudentEvaluationRounds(Long userId, Long submissionId);
}
