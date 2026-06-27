import axiosClient from "./axiosClient";
import type { AdminCreateUserRequest, User } from "../types";

const userApi = {
    getAllUsers: () => {
        return axiosClient.get<User[]>("/users").then((response) => response.data);
    },
    getUserById: (userId: number) => {
        return axiosClient.get<User>(`/users/${userId}`).then((response) => response.data);
    },
    createUser: (payload: AdminCreateUserRequest) => {
        return axiosClient.post<User>("/users", payload).then((response) => response.data);
    },
    disableUser: (userId: number) => {
        return axiosClient.put<User>(`/users/${userId}/disable`).then((response) => response.data);
    },
    enableUser: (userId: number) => {
        return axiosClient.put<User>(`/users/${userId}/enable`).then((response) => response.data);
    },
    deleteUser: (userId: number) => {
        return axiosClient.delete<void>(`/users/${userId}`).then((response) => response.data);
    },
};

export default userApi;
