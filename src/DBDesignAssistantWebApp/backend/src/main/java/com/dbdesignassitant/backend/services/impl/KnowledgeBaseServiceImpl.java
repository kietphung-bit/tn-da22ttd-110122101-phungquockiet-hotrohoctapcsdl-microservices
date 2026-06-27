package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.KnowledgeBaseRequest;
import com.dbdesignassitant.backend.dtos.response.KnowledgeBaseResponse;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeBaseRepository repository;
    private final UserRepository userRepository;

    @Override
    public List<KnowledgeBaseResponse> getAllKnowledgeBases() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<KnowledgeBaseResponse> getSubmittedKnowledge() {
        return repository.findByApprovalStatus(KnowledgeApprovalStatus.SUBMITTED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<KnowledgeBaseResponse> getKnowledgeBaseByInstructor(Long instructorId) {
        return repository.findByCreatedBy_UserId(instructorId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<KnowledgeBaseResponse> getApprovedSystemKnowledge() {
        return repository.findByIsActiveTrueAndKnowledgeScopeAndApprovalStatus(KnowledgeScope.SYSTEM, KnowledgeApprovalStatus.APPROVED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public KnowledgeBaseResponse getKnowledgeBaseById(Long id) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));
        return mapToResponse(kb);
    }

    @Override
    public KnowledgeBaseResponse createKnowledgeBase(KnowledgeBaseRequest request, Long userId, RoleName roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        KnowledgeScope scope = (roleName == RoleName.ADMIN) ? KnowledgeScope.SYSTEM : KnowledgeScope.INSTRUCTOR_CONTRIBUTED;
        KnowledgeApprovalStatus status = (roleName == RoleName.ADMIN) ? KnowledgeApprovalStatus.APPROVED : KnowledgeApprovalStatus.DRAFT;

        KnowledgeBase kb = KnowledgeBase.builder()
                .kbTitle(request.getKbTitle())
                .kbContent(request.getKbContent())
                .kbSource(request.getKbSource())
                .kbCategory(request.getKbCategory())
                .kbVector(request.getKbVector())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(user)
                .knowledgeScope(scope)
                .approvalStatus(status)
                .build();
        return mapToResponse(repository.save(kb));
    }

    @Override
    public KnowledgeBaseResponse updateKnowledgeBase(Long id, KnowledgeBaseRequest request, Long userId, RoleName roleName) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));

        if (roleName != RoleName.ADMIN) {
            // Check ownership and status
            if (kb.getCreatedBy() == null || !kb.getCreatedBy().getUserId().equals(userId)) {
                throw new RuntimeException("You do not have permission to edit this knowledge base"); // In a real app use Custom exception
            }
            if (kb.getApprovalStatus() == KnowledgeApprovalStatus.SUBMITTED || kb.getApprovalStatus() == KnowledgeApprovalStatus.APPROVED) {
                throw new RuntimeException("Cannot edit knowledge base that is SUBMITTED or APPROVED");
            }
        }

        kb.setKbTitle(request.getKbTitle());
        kb.setKbContent(request.getKbContent());
        kb.setKbSource(request.getKbSource());
        kb.setKbCategory(request.getKbCategory());
        kb.setKbVector(request.getKbVector());
        if (request.getIsActive() != null) {
            kb.setIsActive(request.getIsActive());
        }

        return mapToResponse(repository.save(kb));
    }

    @Override
    public void deleteKnowledgeBase(Long id, Long userId, RoleName roleName) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));
        
        if (roleName != RoleName.ADMIN) {
            if (kb.getCreatedBy() == null || !kb.getCreatedBy().getUserId().equals(userId)) {
                throw new RuntimeException("You do not have permission to delete this knowledge base");
            }
            if (kb.getApprovalStatus() == KnowledgeApprovalStatus.SUBMITTED || kb.getApprovalStatus() == KnowledgeApprovalStatus.APPROVED) {
                throw new RuntimeException("Cannot delete knowledge base that is SUBMITTED or APPROVED");
            }
        }

        repository.delete(kb);
    }

    @Override
    public KnowledgeBaseResponse submitKnowledgeBase(Long id, Long instructorId) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));

        if (kb.getCreatedBy() == null || !kb.getCreatedBy().getUserId().equals(instructorId)) {
            throw new RuntimeException("You do not have permission to submit this knowledge base");
        }
        
        if (kb.getApprovalStatus() != KnowledgeApprovalStatus.DRAFT && kb.getApprovalStatus() != KnowledgeApprovalStatus.REJECTED) {
            throw new RuntimeException("Only DRAFT or REJECTED knowledge can be submitted");
        }

        kb.setApprovalStatus(KnowledgeApprovalStatus.SUBMITTED);
        return mapToResponse(repository.save(kb));
    }

    @Override
    public KnowledgeBaseResponse approveKnowledgeBase(Long id, Long adminId) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (kb.getApprovalStatus() != KnowledgeApprovalStatus.SUBMITTED) {
            throw new RuntimeException("Only SUBMITTED knowledge can be approved");
        }

        kb.setApprovalStatus(KnowledgeApprovalStatus.APPROVED);
        kb.setReviewedBy(admin);
        kb.setReviewedAt(LocalDateTime.now());
        kb.setReviewNote(null);
        
        return mapToResponse(repository.save(kb));
    }

    @Override
    public KnowledgeBaseResponse rejectKnowledgeBase(Long id, Long adminId, String reviewNote) {
        KnowledgeBase kb = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KnowledgeBase not found with id: " + id));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (kb.getApprovalStatus() != KnowledgeApprovalStatus.SUBMITTED) {
            throw new RuntimeException("Only SUBMITTED knowledge can be rejected");
        }

        kb.setApprovalStatus(KnowledgeApprovalStatus.REJECTED);
        kb.setReviewedBy(admin);
        kb.setReviewedAt(LocalDateTime.now());
        kb.setReviewNote(reviewNote);
        
        return mapToResponse(repository.save(kb));
    }

    private KnowledgeBaseResponse mapToResponse(KnowledgeBase kb) {
        return KnowledgeBaseResponse.builder()
                .kbId(kb.getKbId())
                .kbTitle(kb.getKbTitle())
                .kbContent(kb.getKbContent())
                .kbSource(kb.getKbSource())
                .kbCategory(kb.getKbCategory())
                .kbVector(kb.getKbVector())
                .isActive(kb.getIsActive())
                .createdAt(kb.getCreatedAt())
                .updatedAt(kb.getUpdatedAt())
                .createdById(kb.getCreatedBy() != null ? kb.getCreatedBy().getUserId() : null)
                .createdByName(kb.getCreatedBy() != null ? kb.getCreatedBy().getFullName() : null)
                .approvalStatus(kb.getApprovalStatus())
                .knowledgeScope(kb.getKnowledgeScope())
                .reviewedById(kb.getReviewedBy() != null ? kb.getReviewedBy().getUserId() : null)
                .reviewedByName(kb.getReviewedBy() != null ? kb.getReviewedBy().getFullName() : null)
                .reviewedAt(kb.getReviewedAt())
                .reviewNote(kb.getReviewNote())
                .build();
    }
}
