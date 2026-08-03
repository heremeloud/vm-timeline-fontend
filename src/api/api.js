import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const api = setupCache(axios.create({
    baseURL: import.meta.env.VITE_API_URL ,
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

let redirectingToLogin = false;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;
        const isStaleAuthentication = status === 401
            || (status === 403 && detail === "Invalid token");

        if (isStaleAuthentication && localStorage.getItem("jwt")) {
            localStorage.removeItem("jwt");
            if (!redirectingToLogin && window.location.pathname !== "/admin") {
                redirectingToLogin = true;
                window.location.assign("/admin?expired=1");
            }
        }

        return Promise.reject(error);
    },
);

export default api;
