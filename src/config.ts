/** Base URL of the FastAPI backend (also used to resolve its `/static/` assets). */
export const API_BASE: string = import.meta.env.VITE_API_URL || "http://localhost:8000";
