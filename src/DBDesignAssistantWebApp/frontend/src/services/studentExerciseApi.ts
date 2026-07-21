import axiosClient from './axiosClient';
import type { Exercise, ExerciseGenerationRequest, ExerciseGenerationResponse } from '../types';

export const studentExerciseApi = {
  getAll: (params?: { search?: string; archived?: boolean }) => {
    return axiosClient.get<Exercise[]>('/student/exercises', { params }).then(res => res.data);
  },

  getById: (id: number) => {
    return axiosClient.get<Exercise>(`/student/exercises/${id}`).then(res => res.data);
  },

  generate: (data: ExerciseGenerationRequest) => {
    return axiosClient.post<ExerciseGenerationResponse>('/student/exercises/generate', data).then(res => res.data);
  },

  archive: (id: number) => {
    return axiosClient.put<Exercise>(`/student/exercises/${id}/archive`).then(res => res.data);
  },

  restore: (id: number) => {
    return axiosClient.put<Exercise>(`/student/exercises/${id}/restore`).then(res => res.data);
  },
};
