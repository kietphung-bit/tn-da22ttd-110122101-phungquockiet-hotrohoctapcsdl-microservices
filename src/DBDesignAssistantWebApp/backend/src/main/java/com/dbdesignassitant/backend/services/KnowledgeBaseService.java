package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.KnowledgeBaseRequest;
import com.dbdesignassitant.backend.dtos.response.KnowledgeBaseResponse;
import com.dbdesignassitant.backend.enums.RoleName;

import java.util.List;

public interface KnowledgeBaseService {
    List<KnowledgeBaseResponse> getAllKnowledgeBases();
    List<KnowledgeBaseResponse> getSubmittedKnowledge();
    List<KnowledgeBaseResponse> getKnowledgeBaseByInstructor(Long instructorId);
    List<KnowledgeBaseResponse> getApprovedSystemKnowledge();
    
    KnowledgeBaseResponse getKnowledgeBaseById(Long id);
    
    KnowledgeBaseResponse createKnowledgeBase(KnowledgeBaseRequest request, Long userId, RoleName roleName);
    KnowledgeBaseResponse updateKnowledgeBase(Long id, KnowledgeBaseRequest request, Long userId, RoleName roleName);
    void deleteKnowledgeBase(Long id, Long userId, RoleName roleName);
    
    KnowledgeBaseResponse submitKnowledgeBase(Long id, Long instructorId);
    KnowledgeBaseResponse approveKnowledgeBase(Long id, Long adminId);
    KnowledgeBaseResponse rejectKnowledgeBase(Long id, Long adminId, String reviewNote);
}
