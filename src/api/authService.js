import api from "./api";

export const login = (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return api.post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
};
