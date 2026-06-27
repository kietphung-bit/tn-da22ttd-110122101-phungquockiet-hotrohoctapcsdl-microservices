import axiosClient from "./axiosClient";
import type { KnowledgeBase, KnowledgeBaseRequest } from "../types";

const instructorKnowledgeBaseApi = {
    getMyKnowledge: () => {
        return axiosClient
            .get<KnowledgeBase[]>("/instructor/knowledge-base/my")
            .then((res) => res.data);
    },
    getSystemKnowledge: () => {
        return axiosClient
            .get<KnowledgeBase[]>("/instructor/knowledge-base/system")
            .then((res) => res.data);
    },
    getById: (id: number) => {
        return axiosClient
            .get<KnowledgeBase>(`/instructor/knowledge-base/${id}`)
            .then((res) => res.data);
    },
    create: (data: KnowledgeBaseRequest) => {
        return axiosClient
            .post<KnowledgeBase>("/instructor/knowledge-base", data)
            .then((res) => res.data);
    },
    update: (id: number, data: KnowledgeBaseRequest) => {
        return axiosClient
            .put<KnowledgeBase>(`/instructor/knowledge-base/${id}`, data)
            .then((res) => res.data);
    },
    delete: (id: number) => {
        return axiosClient
            .delete(`/instructor/knowledge-base/${id}`)
            .then((res) => res.data);
    },
    submit: (id: number) => {
        return axiosClient
            .put<KnowledgeBase>(`/instructor/knowledge-base/${id}/submit`)
            .then((res) => res.data);
    },
};

export default instructorKnowledgeBaseApi;
