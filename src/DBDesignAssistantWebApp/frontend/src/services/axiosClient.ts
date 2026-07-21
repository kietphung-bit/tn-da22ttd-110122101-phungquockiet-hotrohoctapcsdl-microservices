import axios, {
    AxiosHeaders,
    type AxiosError,
    type InternalAxiosRequestConfig,
} from "axios";

type ApiResponse<T> = {
    status: number;
    message: string;
    data: T;
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080/api";

const axiosClient = axios.create({
    baseURL: apiBaseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
        if (!config.headers) {
            config.headers = new AxiosHeaders();
        }
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response) => {
        const payload = response.data as ApiResponse<unknown> | unknown;
        if (payload && typeof payload === "object" && "data" in payload) {
            response.data = (payload as ApiResponse<unknown>).data;
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
