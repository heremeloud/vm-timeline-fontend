import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const api = setupCache(axios.create({
    baseURL: import.meta.env.VITE_API_URL,
}), {
    ttl: 1000 * 60 * 10,  // cache 10 minutes
});

// const api = axios.create({
//     baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
// });

// Add token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwt");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;
