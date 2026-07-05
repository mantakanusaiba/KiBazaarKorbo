import { useEffect, useState } from "react";

export default function useSessionState(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const saved = sessionStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore storage error
        }
    }, [key, value]);

    return [value, setValue];
}