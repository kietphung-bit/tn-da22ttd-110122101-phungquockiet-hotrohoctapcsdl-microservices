package com.dbdesignassitant.backend.utils;

import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserProvider {
    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authenticated user is required");
        }

        String email = authentication.getName();
        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            throw new AccessDeniedException("Authenticated user is required");
        }

        return userRepository.findByUserEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user is not active"));
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getUserId();
    }
}
