import axiosClient from "./axiosClient";
import type {
    ChatConversationDetail,
    ChatConversationSummary,
    ChatRequest,
    ChatResponse,
} from "../types";

const chatbotApi = {
    askRag: (data: ChatRequest) => {
        return axiosClient
            .post<ChatResponse>("/chatbot/rag", data)
            .then((res) => res.data);
    },
    listConversations: (archived = false) => {
        return axiosClient
            .get<ChatConversationSummary[]>("/chatbot/conversations", {
                params: { archived },
            })
            .then((res) => res.data);
    },
    getConversation: (conversationId: string) => {
        return axiosClient
            .get<ChatConversationDetail>(`/chatbot/conversations/${conversationId}`)
            .then((res) => res.data);
    },
    archiveConversation: (conversationId: string) => {
        return axiosClient
            .put<ChatConversationSummary>(`/chatbot/conversations/${conversationId}/archive`)
            .then((res) => res.data);
    },
    restoreConversation: (conversationId: string) => {
        return axiosClient
            .put<ChatConversationSummary>(`/chatbot/conversations/${conversationId}/restore`)
            .then((res) => res.data);
    },
};

export default chatbotApi;
