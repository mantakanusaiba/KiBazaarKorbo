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

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const memoryCache = {
    pricesToday: {
        data: null,
        time: 0,
        promise: null,
    },
    products: {
        data: null,
        time: 0,
        promise: null,
    },
};

function readSessionCache(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.time || !Array.isArray(parsed?.data)) return null;

        if (Date.now() - parsed.time > CACHE_TTL) return null;

        return parsed.data;
    } catch {
        return null;
    }
}

function writeSessionCache(key, data) {
    try {
        sessionStorage.setItem(
            key,
            JSON.stringify({
                time: Date.now(),
                data,
            })
        );
    } catch {
        /* ignore */
    }
}

function cachedRequest(cacheName, sessionKey, requestFn, options = {}) {
    const cache = memoryCache[cacheName];
    const force = options?.force === true;

    if (!force && cache.data && Date.now() - cache.time < CACHE_TTL) {
        return Promise.resolve({ data: cache.data });
    }

    if (!force) {
        const sessionData = readSessionCache(sessionKey);

        if (sessionData) {
            cache.data = sessionData;
            cache.time = Date.now();

            return Promise.resolve({ data: sessionData });
        }
    }

    if (!force && cache.promise) {
        return cache.promise;
    }

    cache.promise = requestFn()
        .then((res) => {
            const data = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            cache.data = data;
            cache.time = Date.now();
            cache.promise = null;

            writeSessionCache(sessionKey, data);

            return { ...res, data };
        })
        .catch((err) => {
            cache.promise = null;
            throw err;
        });

    return cache.promise;
}

export function getCachedPricesTodayData() {
    if (memoryCache.pricesToday.data) return memoryCache.pricesToday.data;
    return readSessionCache("mm_prices_today_cache");
}

export function getCachedProductsData() {
    if (memoryCache.products.data) return memoryCache.products.data;
    return readSessionCache("mm_products_cache");
}

export function clearApiCache() {
    memoryCache.pricesToday = { data: null, time: 0, promise: null };
    memoryCache.products = { data: null, time: 0, promise: null };

    try {
        sessionStorage.removeItem("mm_prices_today_cache");
        sessionStorage.removeItem("mm_products_cache");
    } catch {
        /* ignore */
    }
}

export const getPricesToday = (options = {}) =>
    cachedRequest(
        "pricesToday",
        "mm_prices_today_cache",
        () =>
            api.get("/prices/today", {
                timeout: 180000,
                headers: { "Cache-Control": "no-cache" },
            }),
        options
    );

export const getProducts = (options = {}) =>
    cachedRequest(
        "products",
        "mm_products_cache",
        () =>
            api.get("/products", {
                timeout: 180000,
                headers: { "Cache-Control": "no-cache" },
            }),
        options
    );

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