import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
    timeout: 20000,
});

// Intercept slow responses (Render cold-start warning)
api.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
});

export const getPricesToday = () => api.get("/prices/today");
export const getPriceHistory = (p, days = 90) => api.get(`/prices/history/${p}?days=${days}`);
export const getMarketCompare = (p) => api.get(`/prices/markets/${p}`);
export const getForecast = (p) => api.get(`/forecast/${p}`);
export const getExplanation = (p) => api.get(`/explain/${p}`);
export const getProducts = () => api.get("/products");
export const postFairPrice = (product, paid_price) =>
    api.post("/fair-price-check", { product, paid_price });

export default api;