package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.exceptions.RateLimitExceededException;
import com.dbdesignassitant.backend.services.ChatRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
public class InMemoryChatRateLimiter implements ChatRateLimiter {
    private final AiProperties aiProperties;
    private final Clock clock = Clock.systemUTC();
    private final ConcurrentMap<Long, Deque<Instant>> requestsByUser = new ConcurrentHashMap<>();

    @Override
    public void checkAllowed(Long userId) {
        int limit = aiProperties.getChat().getRateLimitPerMinute();
        if (limit <= 0) {
            return;
        }

        Instant now = Instant.now(clock);
        Instant windowStart = now.minusSeconds(60);
        Deque<Instant> requestTimes = requestsByUser.computeIfAbsent(userId, ignored -> new ArrayDeque<>());

        synchronized (requestTimes) {
            while (!requestTimes.isEmpty() && requestTimes.peekFirst().isBefore(windowStart)) {
                requestTimes.removeFirst();
            }
            if (requestTimes.size() >= limit) {
                throw new RateLimitExceededException(
                        "Ban da gui qua nhieu cau hoi. Vui long cho mot phut roi thu lai.");
            }
            requestTimes.addLast(now);
        }
    }
}
