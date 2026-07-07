import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

console.log("API base URL:", API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 180000,
});

api.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
});

export const getPricesToday = () =>
    api.get("/prices/today", {
        timeout: 180000,
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-cache" },
    });

export const getPriceHistory = (p, days = 90) =>
    api.get(`/prices/history/${p}`, { params: { days } });

export const getMarketCompare = (p) =>
    api.get(`/prices/markets/${p}`);

export const getForecast = (p, market, days = 7) =>
    api.get(`/forecast/${p}`, {
        timeout: 180000,
        params: market ? { market, days } : { days },
    });

export const getExplanation = (p, market) =>
    api.get(`/explain/${p}`, {
        timeout: 180000,
        params: market ? { market } : {},
    });

export const getProducts = () =>
    api.get("/products", {
        timeout: 180000,
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-cache" },
    });

export const postFairPrice = (product, paid_price) =>
    api.post("/fair-price-check", { product, paid_price }, { timeout: 180000 });

export const optimizeBasket = (items, markets) =>
    api.post(
        "/basket/optimize",
        markets && markets.length ? { items, markets } : { items },
        { timeout: 180000 }
    );

export const postAgentChat = (message, history = []) =>
    api.post("/chat", { message, history }, { timeout: 180000 });

export default api;