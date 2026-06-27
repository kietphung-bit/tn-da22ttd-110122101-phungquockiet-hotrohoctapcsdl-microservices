import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export const useAuthInit = () => {
    const checkAuth = useAuthStore((state) => state.checkAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
};
