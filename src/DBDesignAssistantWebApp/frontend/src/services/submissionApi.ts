import axiosClient from "./axiosClient";
import type { AdminEvaluationRound, Submission, AIEvaluation, SubmissionStatus } from "../types";

type SubmissionFilters = {
    status?: SubmissionStatus;
    exerciseId?: number;
    userId?: number;
};

type EvaluationRoundFilters = {
    status?: SubmissionStatus;
    provider?: string;
    fallbackUsed?: boolean;
    submissionId?: number;
    studentId?: number;
};

const submissionApi = {
    getSubmissions: (filters?: SubmissionFilters) => {
        return axiosClient
            .get<Submission[]>("/submissions", { params: filters })
            .then((response) => response.data);
    },
    getSubmissionById: (submissionId: number) => {
        return axiosClient
            .get<Submission>(`/submissions/${submissionId}`)
            .then((response) => response.data);
    },
    getEvaluationBySubmissionId: (submissionId: number) => {
        return axiosClient
            .get<AIEvaluation>(`/submissions/${submissionId}/evaluation`)
            .then((response) => response.data);
    },
    getEvaluationRounds: (filters?: EvaluationRoundFilters) => {
        return axiosClient
            .get<AdminEvaluationRound[]>("/admin/evaluation-rounds", { params: filters })
            .then((response) => response.data);
    },
};

export default submissionApi;
