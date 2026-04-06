// API configuration - automatically detects environment
// In production (Vercel), API routes are relative to the same domain
// In development, uses VITE_API_URL from .env file

const API_URL = import.meta.env.VITE_API_URL || "";

export default API_URL;
