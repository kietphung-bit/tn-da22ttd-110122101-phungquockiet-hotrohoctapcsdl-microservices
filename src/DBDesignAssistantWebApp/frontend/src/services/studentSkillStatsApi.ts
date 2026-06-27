import axiosClient from "./axiosClient";
import type { StudentSkillStats } from "../types";

type StatsFilters = {
    studentId?: number;
    skillId?: number;
};

const studentSkillStatsApi = {
    getStats: (filters?: StatsFilters) => {
        return axiosClient
            .get<StudentSkillStats[]>("/student-skill-stats", { params: filters })
            .then((res) => res.data);
    },
    getById: (id: number) => {
        return axiosClient
            .get<StudentSkillStats>(`/student-skill-stats/${id}`)
            .then((res) => res.data);
    },
};

export default studentSkillStatsApi;
