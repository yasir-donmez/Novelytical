import * as Sentry from "@sentry/nextjs";

// Initialize Sentry for client-side error tracking
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring - 10% in production
    tracesSampleRate: 0.1,

    // Session Replay - 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment
    environment: process.env.NODE_ENV,

    // Enable sending events
    enabled: true,

    // Ignore browser extension errors
    ignoreErrors: [
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'fb_xd_fragment',
    ],

    // Integrations
    integrations: [
        Sentry.replayIntegration(),
    ],
});
