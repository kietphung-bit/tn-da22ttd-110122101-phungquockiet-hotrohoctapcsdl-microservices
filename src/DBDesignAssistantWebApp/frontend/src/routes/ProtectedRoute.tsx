import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type ProtectedRouteProps = {
    children: React.ReactElement;
    allowedRoles?: string[];
};

const ProtectedRoute = ({ children, allowedRoles = ["ADMIN"] }: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    if (!isInitialized) {
        return null;
    }
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }
    if (allowedRoles.length > 0 && user.role?.roleName && !allowedRoles.includes(user.role.roleName)) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default ProtectedRoute;
