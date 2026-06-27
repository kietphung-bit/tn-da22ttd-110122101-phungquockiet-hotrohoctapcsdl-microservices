package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.entities.ChatConversation;
import com.dbdesignassitant.backend.entities.ChatMessage;

import java.util.List;

public interface ChatHistorySummarizer {
    List<ChatMessage> selectPromptMessages(ChatConversation conversation);
}
