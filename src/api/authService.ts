import api from "./api";

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const login = (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return api.post<LoginResponse>("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
};
