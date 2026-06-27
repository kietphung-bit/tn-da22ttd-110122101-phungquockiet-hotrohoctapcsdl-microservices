import axiosClient from './axiosClient';
import type { AIEvaluation, EvaluationRound, Submission, SubmissionStatusResponse } from '../types';

export const studentSubmissionApi = {
  getAll: () => {
    return axiosClient.get<Submission[]>('/student/submissions').then(res => res.data);
  },

  getById: (id: number) => {
    return axiosClient.get<Submission>(`/student/submissions/${id}`).then(res => res.data);
  },

  createDraft: (exerciseId: number) => {
    return axiosClient.post<Submission>(`/student/exercises/${exerciseId}/submissions`).then(res => res.data);
  },

  updateDraft: (id: number, data: { diagramData: Record<string, unknown> }) => {
    return axiosClient.put<Submission>(`/student/submissions/${id}/draft`, data).then(res => res.data);
  },

  submit: (id: number, data?: { diagramData: Record<string, unknown> }) => {
    return axiosClient.put<Submission>(`/student/submissions/${id}/submit`, data).then(res => res.data);
  },

  getStatus: (id: number) => {
    return axiosClient.get<SubmissionStatusResponse>(`/student/submissions/${id}/status`).then(res => res.data);
  },

  getEvaluation: (id: number) => {
    return axiosClient.get<AIEvaluation>(`/student/submissions/${id}/evaluation`).then(res => res.data);
  },

  getEvaluationRounds: (id: number) => {
    return axiosClient.get<EvaluationRound[]>(`/student/submissions/${id}/evaluation-rounds`).then(res => res.data);
  },
};
