import axiosClient from './axiosClient';
import type { SampleSolution, SampleSolutionRequest } from '../types';

export const instructorSampleSolutionApi = {
  getSampleSolutionByExerciseId: (exerciseId: number) => {
    return axiosClient.get<SampleSolution>(`/instructor/exercises/${exerciseId}/sample-solution`).then(res => res.data);
  },

  createSampleSolution: (exerciseId: number, data: SampleSolutionRequest) => {
    return axiosClient.post<SampleSolution>(`/instructor/exercises/${exerciseId}/sample-solution`, data).then(res => res.data);
  },

  updateSampleSolution: (id: number, data: SampleSolutionRequest) => {
    return axiosClient.put<SampleSolution>(`/instructor/sample-solutions/${id}`, data).then(res => res.data);
  },

  deleteSampleSolution: (id: number) => {
    return axiosClient.delete(`/instructor/sample-solutions/${id}`).then(res => res.data);
  },
};
