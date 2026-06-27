import axiosClient from "./axiosClient";
import type {
    AdminPracticeInsightsFilters,
    AdminPracticeInsightsResponse,
    InstructorExerciseInsightsFilters,
    InstructorExerciseInsightsResponse,
} from "../types";

const practiceInsightsApi = {
    getAdminPracticeInsights: (filters?: AdminPracticeInsightsFilters) => {
        return axiosClient
            .get<AdminPracticeInsightsResponse>("/admin/practice-insights", { params: filters })
            .then((response) => response.data);
    },

    getInstructorExerciseInsights: (
        exerciseId: number,
        filters?: InstructorExerciseInsightsFilters
    ) => {
        return axiosClient
            .get<InstructorExerciseInsightsResponse>(
                `/instructor/exercises/${exerciseId}/insights`,
                { params: filters }
            )
            .then((response) => response.data);
    },
};

export default practiceInsightsApi;
