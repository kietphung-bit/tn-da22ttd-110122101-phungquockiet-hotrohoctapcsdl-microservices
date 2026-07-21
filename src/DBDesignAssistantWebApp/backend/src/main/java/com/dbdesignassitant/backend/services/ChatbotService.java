package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.ChatRequest;
import com.dbdesignassitant.backend.dtos.response.ChatConversationDetailResponse;
import com.dbdesignassitant.backend.dtos.response.ChatConversationSummaryResponse;
import com.dbdesignassitant.backend.dtos.response.ChatResponse;

import java.util.List;

public interface ChatbotService {
    ChatResponse ask(ChatRequest request);

    List<ChatConversationSummaryResponse> listConversations(boolean archived);

    ChatConversationDetailResponse getConversation(String conversationId);

    ChatConversationSummaryResponse setConversationArchived(String conversationId, boolean archived);
}
