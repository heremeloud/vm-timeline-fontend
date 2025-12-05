// pages/AdminLogin.jsx
import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function login(e) {
        e.preventDefault();

        try {
            const form = new URLSearchParams();
            form.append("username", username);
            form.append("password", password);

            const res = await api.post("/auth/login", form, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            localStorage.setItem("jwt", res.data.access_token);
            navigate("/");
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
