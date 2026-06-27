import axiosClient from "./axiosClient";
import type { Skill, SkillRequest } from "../types";

const skillApi = {
    getAll: () => {
        return axiosClient
            .get<Skill[]>("/skills")
            .then((res) => res.data);
    },
    getById: (id: number) => {
        return axiosClient
            .get<Skill>(`/skills/${id}`)
            .then((res) => res.data);
    },
    create: (data: SkillRequest) => {
        return axiosClient
            .post<Skill>("/skills", data)
            .then((res) => res.data);
    },
    update: (id: number, data: SkillRequest) => {
        return axiosClient
            .put<Skill>(`/skills/${id}`, data)
            .then((res) => res.data);
    },
    delete: (id: number) => {
        return axiosClient
            .delete(`/skills/${id}`)
            .then((res) => res.data);
    },
};

export default skillApi;
