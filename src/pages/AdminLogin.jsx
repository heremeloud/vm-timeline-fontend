// pages/AdminLogin.jsx
import { useState } from "react";
import { login as loginRequest } from "../api/authService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../routes";
import "../styles/EventForm.css";

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    async function login(e) {
        e.preventDefault();

        try {
            const res = await loginRequest(username, password);
            localStorage.setItem("jwt", res.data.access_token);
            navigate(ROUTES.home);
        } catch (err) {
            console.error(err);
            alert("Login failed");
        }
    }

    return (
        <div className="eventform-container">
            <h2>Admin Login</h2>
            {searchParams.get("expired") === "1" && (
                <p className="eventform-field-note">Your admin session expired. Please sign in again.</p>
            )}

            <form className="eventform-form" onSubmit={login}>
                <div className="eventform-section">
                <label>Username <span className="form-required">*</span></label>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                />
                </div>

                <div className="eventform-section">
                <label>Password <span className="form-required">*</span></label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
                </div>

                <div className="eventform-section">
                    <button type="submit" className="form-primary-submit">Login</button>
                </div>
            </form>
        </div>
    );
}
