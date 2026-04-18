import { Navigate } from "react-router-dom";
import { ROUTES } from "../routes";

export default function ProtectedRoute({ children }) {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return <Navigate to={ROUTES.admin} replace />;
    return children;
}
