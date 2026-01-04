import axios from 'axios';
import { handleError } from '@/lib/errors/handler';
import { NetworkError, ServerError } from '@/lib/errors/types';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:5050/api' : '/api'),
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
