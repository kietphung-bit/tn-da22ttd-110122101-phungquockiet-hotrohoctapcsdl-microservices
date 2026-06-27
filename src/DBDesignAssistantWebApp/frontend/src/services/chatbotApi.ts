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
    listConversations: () => {
        return axiosClient
            .get<ChatConversationSummary[]>("/chatbot/conversations")
            .then((res) => res.data);
    },
    getConversation: (conversationId: string) => {
        return axiosClient
            .get<ChatConversationDetail>(`/chatbot/conversations/${conversationId}`)
            .then((res) => res.data);
    },
};

export default chatbotApi;
