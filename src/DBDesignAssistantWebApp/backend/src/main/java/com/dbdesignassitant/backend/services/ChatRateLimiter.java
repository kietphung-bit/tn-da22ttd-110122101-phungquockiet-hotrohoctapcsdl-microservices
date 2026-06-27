package com.dbdesignassitant.backend.services;

public interface ChatRateLimiter {
    void checkAllowed(Long userId);
}
