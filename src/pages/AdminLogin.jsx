// pages/AdminLogin.jsx
import { useState } from "react";
import { login as loginRequest } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../routes";

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

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
        <div style={{ padding: 20 }}>
            <h2>Admin Login</h2>

            <form onSubmit={login}>
                <label>Username:</label>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <br /><br />

                <label>Password:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <br /><br />

                <button type="submit">Login</button>
            </form>
        </div>
    );
}
