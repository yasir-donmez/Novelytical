import axios from 'axios';
import { handleError } from '@/lib/errors/handler';
import { NetworkError, ServerError } from '@/lib/errors/types';

const getBaseUrl = () => {
    // Client-side: always use '/api' proxy (handled by next.config.mjs rewrites)
    if (typeof window !== 'undefined') {
        return '/api';
    }

    // Server-side: use API_URL environment variable or fallback
    const apiUrl = process.env.API_URL || 'http://localhost:5050';
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add Firebase auth token
api.interceptors.request.use(
    async (config) => {
        // Add auth token if user is logged in
        try {
            const { auth } = await import('./firebase');
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error attaching auth token:", error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor with error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Network error (no response from server)
        if (!error.response) {
            handleError(new NetworkError());
        }
        // Server error (5xx)
        else if (error.response.status >= 500) {
            handleError(new ServerError());
        }
        // Let component handle other errors (404, 400, etc.)

        return Promise.reject(error);
    }
);

export default api;
