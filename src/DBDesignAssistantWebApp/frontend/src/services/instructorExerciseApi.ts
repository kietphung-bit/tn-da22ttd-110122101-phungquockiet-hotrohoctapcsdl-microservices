import axiosClient from './axiosClient';
import type {
  Exercise,
  ExerciseGenerationRequest,
  ExerciseGenerationResponse,
  ExerciseRequest,
  ExerciseReviewRequest,
} from '../types';

export const instructorExerciseApi = {
  getAll: (params?: { search?: string; exerciseSource?: string; isPublished?: boolean }) => {
    return axiosClient.get<Exercise[]>('/instructor/exercises', { params }).then(res => res.data);
  },

  getById: (id: number) => {
    return axiosClient.get<Exercise>(`/instructor/exercises/${id}`).then(res => res.data);
  },

  create: (data: ExerciseRequest) => {
    return axiosClient.post<Exercise>('/instructor/exercises', data).then(res => res.data);
  },

  update: (id: number, data: ExerciseRequest) => {
    return axiosClient.put<Exercise>(`/instructor/exercises/${id}`, data).then(res => res.data);
  },

  delete: (id: number) => {
    return axiosClient.delete(`/instructor/exercises/${id}`).then(res => res.data);
  },

  publish: (id: number) => {
    return axiosClient.put<Exercise>(`/instructor/exercises/${id}/publish`).then(res => res.data);
  },

  unpublish: (id: number) => {
    return axiosClient.put<Exercise>(`/instructor/exercises/${id}/unpublish`).then(res => res.data);
  },

  generate: (data: ExerciseGenerationRequest) => {
    return axiosClient
      .post<ExerciseGenerationResponse>('/instructor/exercises/generate', data)
      .then(res => res.data);
  },

  approve: (id: number, data: ExerciseReviewRequest) => {
    return axiosClient.put<Exercise>(`/instructor/exercises/${id}/approve`, data).then(res => res.data);
  },

  reject: (id: number, data: ExerciseReviewRequest) => {
    return axiosClient.put<Exercise>(`/instructor/exercises/${id}/reject`, data).then(res => res.data);
  },
};
