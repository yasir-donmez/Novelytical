/**
 * Application route constants
 */
export const ROUTES = {
    HOME: '/',
    NOVEL_DETAIL: (id: number | string) => `/novel/${id}`,
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
} as const;
