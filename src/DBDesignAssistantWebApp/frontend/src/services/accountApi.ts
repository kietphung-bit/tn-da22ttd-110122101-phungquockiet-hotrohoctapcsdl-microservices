import axiosClient from "./axiosClient";
import type { AccountProfileUpdateRequest, ChangePasswordRequest, User } from "../types";

const accountApi = {
    getMe: () => {
        return axiosClient.get<User>("/account/me").then((response) => response.data);
    },
    updateProfile: (payload: AccountProfileUpdateRequest) => {
        return axiosClient.put<User>("/account/profile", payload).then((response) => response.data);
    },
    changePassword: (payload: ChangePasswordRequest) => {
        return axiosClient.put<void>("/account/password", payload).then((response) => response.data);
    },
};

export default accountApi;
