import axiosClient from "./axiosClient";
import type { Exercise, ExerciseRequest } from "../types";

type ExerciseFilters = {
    search?: string;
    exerciseSource?: string;
    isPublished?: boolean;
};

const exerciseApi = {
    getAllExercises: () => {
        return axiosClient.get<Exercise[]>("/exercises").then((response) => response.data);
    },
    getExercises: (filters?: ExerciseFilters) => {
        return axiosClient
            .get<Exercise[]>("/exercises", { params: filters })
            .then((response) => response.data);
    },
    getExerciseById: (exerciseId: number) => {
        return axiosClient.get<Exercise>(`/exercises/${exerciseId}`).then((response) => response.data);
    },
    createExercise: (payload: ExerciseRequest) => {
        return axiosClient.post<Exercise>("/exercises", payload).then((response) => response.data);
    },
    updateExercise: (exerciseId: number, payload: ExerciseRequest) => {
        return axiosClient.put<Exercise>(`/exercises/${exerciseId}`, payload).then((response) => response.data);
    },
    publishExercise: (exerciseId: number) => {
        return axiosClient.put<Exercise>(`/exercises/${exerciseId}/publish`).then((response) => response.data);
    },
    unpublishExercise: (exerciseId: number) => {
        return axiosClient.put<Exercise>(`/exercises/${exerciseId}/unpublish`).then((response) => response.data);
    },
    deleteExercise: (exerciseId: number) => {
        return axiosClient.delete<void>(`/exercises/${exerciseId}`).then((response) => response.data);
    },
};

export default exerciseApi;
