import axiosClient from "./axiosClient";
import type { KnowledgeBase, KnowledgeBaseRequest } from "../types";

const knowledgeBaseApi = {
    getAll: (status?: string) => {
        const url = status ? `/knowledge-base?status=${status}` : "/knowledge-base";
        return axiosClient
            .get<KnowledgeBase[]>(url)
            .then((res) => res.data);
    },
    getById: (id: number) => {
        return axiosClient
            .get<KnowledgeBase>(`/knowledge-base/${id}`)
            .then((res) => res.data);
    },
    create: (data: KnowledgeBaseRequest) => {
        return axiosClient
            .post<KnowledgeBase>("/knowledge-base", data)
            .then((res) => res.data);
    },
    update: (id: number, data: KnowledgeBaseRequest) => {
        return axiosClient
            .put<KnowledgeBase>(`/knowledge-base/${id}`, data)
            .then((res) => res.data);
    },
    delete: (id: number) => {
        return axiosClient
            .delete(`/knowledge-base/${id}`)
            .then((res) => res.data);
    },
    approve: (id: number) => {
        return axiosClient
            .put<KnowledgeBase>(`/knowledge-base/${id}/approve`)
            .then((res) => res.data);
    },
    reject: (id: number, reviewNote: string) => {
        return axiosClient
            .put<KnowledgeBase>(`/knowledge-base/${id}/reject`, { reviewNote })
            .then((res) => res.data);
    },
};

export default knowledgeBaseApi;
