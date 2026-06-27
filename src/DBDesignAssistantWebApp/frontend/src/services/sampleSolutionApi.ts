import axiosClient from "./axiosClient";
import type { SampleSolution, SampleSolutionRequest } from "../types";

const sampleSolutionApi = {
    getAllSampleSolutions: () => {
        return axiosClient.get<SampleSolution[]>("/sample-solutions").then((response) => response.data);
    },
    getSampleSolutionById: (sampleSolutionId: number) => {
        return axiosClient
            .get<SampleSolution>(`/sample-solutions/${sampleSolutionId}`)
            .then((response) => response.data);
    },
    getSampleSolutionByExerciseId: (exerciseId: number) => {
        return axiosClient
            .get<SampleSolution>(`/exercises/${exerciseId}/sample-solution`)
            .then((response) => response.data);
    },
    createSampleSolution: (exerciseId: number, payload: SampleSolutionRequest) => {
        return axiosClient
            .post<SampleSolution>(`/exercises/${exerciseId}/sample-solution`, payload)
            .then((response) => response.data);
    },
    updateSampleSolution: (sampleSolutionId: number, payload: SampleSolutionRequest) => {
        return axiosClient
            .put<SampleSolution>(`/sample-solutions/${sampleSolutionId}`, payload)
            .then((response) => response.data);
    },
    deleteSampleSolution: (sampleSolutionId: number) => {
        return axiosClient
            .delete<void>(`/sample-solutions/${sampleSolutionId}`)
            .then((response) => response.data);
    },
};

export default sampleSolutionApi;
