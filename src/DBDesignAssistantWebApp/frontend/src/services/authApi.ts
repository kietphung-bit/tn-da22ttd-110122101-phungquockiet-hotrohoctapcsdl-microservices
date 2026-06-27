import axiosClient from "./axiosClient";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types";

const authApi = {
    login: (payload: LoginRequest) => {
        return axiosClient.post<AuthResponse>("/auth/login", payload).then((response) => response.data);
    },
    register: (payload: RegisterRequest) => {
        return axiosClient.post<AuthResponse>("/auth/register", payload).then((response) => response.data);
    },
};

export default authApi;
