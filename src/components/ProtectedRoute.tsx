import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "../routes";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return <Navigate to={ROUTES.admin} replace />;
    return children;
}
