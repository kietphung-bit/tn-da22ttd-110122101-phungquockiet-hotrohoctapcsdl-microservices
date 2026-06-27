import { create } from "zustand";
import { authApi } from "../services";
import type { AuthResponse, LoginRequest, RegisterRequest, RoleName, User } from "../types";

type AuthState = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    login: (payload: LoginRequest) => Promise<AuthResponse>;
    register: (payload: RegisterRequest) => Promise<AuthResponse>;
    logout: () => void;
    checkAuth: () => void;
};

type JwtPayload = {
    sub?: string;
    roleName?: RoleName;
    userId?: number;
};

type AuthMeta = {
    userId: number;
    roleName: RoleName;
    userEmail: string;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
    const parts = token.split(".");
    if (parts.length < 2) {
        return null;
    }
    try {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const json = atob(padded);
        return JSON.parse(json) as JwtPayload;
    } catch {
        return null;
    }
};

const userFromJwt = (token: string): User | null => {
    const payload = decodeJwtPayload(token);
    if (!payload?.roleName || !payload?.userId) {
        return null;
    }
    return {
        userId: payload.userId,
        userEmail: payload.sub ?? "",
        fullName: "",
        userGender: null,
        userDob: null,
        userPhone: null,
        userAddress: null,
        role: {
            roleId: 0,
            roleName: payload.roleName,
        },
        isActive: true,
    };
};

const toUserFromAuth = (auth: AuthResponse): User => {
    return {
        userId: auth.userId,
        userEmail: "",
        fullName: "",
        userGender: null,
        userDob: null,
        userPhone: null,
        userAddress: null,
        role: {
            roleId: 0,
            roleName: auth.roleName as RoleName,
        },
        isActive: true,
    };
};

const userFromMeta = (meta: AuthMeta): User => {
    return {
        userId: meta.userId,
        userEmail: meta.userEmail,
        fullName: "",
        userGender: null,
        userDob: null,
        userPhone: null,
        userAddress: null,
        role: {
            roleId: 0,
            roleName: meta.roleName,
        },
        isActive: true,
    };
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
    login: async (payload: LoginRequest) => {
        const data = await authApi.login(payload);
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("authUser", JSON.stringify(toUserFromAuth(data)));
        localStorage.setItem(
            "authMeta",
            JSON.stringify({ userId: data.userId, roleName: data.roleName, userEmail: payload.userEmail })
        );
        set({
            token: data.accessToken,
            isAuthenticated: true,
            user: toUserFromAuth(data),
            isInitialized: true,
        });
        return data;
    },
    register: async (payload: RegisterRequest) => {
        const data = await authApi.register(payload);
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("authUser", JSON.stringify(toUserFromAuth(data)));
        localStorage.setItem(
            "authMeta",
            JSON.stringify({ userId: data.userId, roleName: data.roleName, userEmail: payload.userEmail })
        );
        set({
            token: data.accessToken,
            isAuthenticated: true,
            user: toUserFromAuth(data),
            isInitialized: true,
        });
        return data;
    },
    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("authUser");
        localStorage.removeItem("authMeta");
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
    },
    checkAuth: () => {
        const token = localStorage.getItem("token");
        const rawUser = localStorage.getItem("authUser");
        const rawMeta = localStorage.getItem("authMeta");
        let user: User | null = null;
        if (rawUser) {
            try {
                user = JSON.parse(rawUser) as User;
            } catch {
                localStorage.removeItem("authUser");
            }
        }
        if (!user && rawMeta) {
            try {
                const meta = JSON.parse(rawMeta) as AuthMeta;
                if (meta?.userId && meta?.roleName) {
                    user = userFromMeta(meta);
                    localStorage.setItem("authUser", JSON.stringify(user));
                }
            } catch {
                localStorage.removeItem("authMeta");
            }
        }
        if (!user && token) {
            user = userFromJwt(token);
            if (user) {
                localStorage.setItem("authUser", JSON.stringify(user));
            }
        }
        set({ token, isAuthenticated: Boolean(token), user, isInitialized: true });
    },
}));
