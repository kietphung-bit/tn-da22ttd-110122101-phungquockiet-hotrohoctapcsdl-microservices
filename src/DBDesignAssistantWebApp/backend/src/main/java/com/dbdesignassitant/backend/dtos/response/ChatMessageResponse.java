package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.ChatMessageRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private Long messageId;
    private ChatMessageRole role;
    private String content;
    private String provider;
    private String model;
    private String retrievalMode;
    private LocalDateTime createdAt;
}
