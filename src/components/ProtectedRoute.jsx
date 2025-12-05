import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return <Navigate to="/admin" replace />;
    return children;
}
