import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

console.log("API URL Loaded:", import.meta.env.VITE_API_URL);

// Add token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwt");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;
