import { AppError } from './types';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

/**
 * Global error handler
 * Handles errors consistently across the application
 * Integrates with Sentry for production error monitoring
 */
export function handleError(error: unknown): AppError {
    console.error('Error caught:', error);

    // Handle AppError instances
    if (error instanceof AppError) {
        // Show user-friendly toast notification
        toast.error(error.message, {
            description: error.code,
            duration: 5000,
        });

        // Log non-operational errors to Sentry (unexpected errors)
        if (!error.isOperational && process.env.NODE_ENV === 'production') {
            Sentry.captureException(error, {
                tags: {
                    errorCode: error.code,
                    statusCode: error.statusCode.toString(),
                },
                level: 'error',
            });
        }

        return error;
    }

    // Handle unknown errors
    const unknownError = new AppError(
        'Beklenmeyen bir hata oluştu',
        'UNKNOWN_ERROR',
        500,
        false
    );

    toast.error(unknownError.message, {
        description: 'Lütfen sayfayı yenilemeyi deneyin',
        duration: 5000,
    });

    // Always log unknown errors to Sentry in production
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
            tags: { errorType: 'unknown' },
            level: 'error',
        });
    }

    return unknownError;
}

/**
 * Error handler for async operations
 * Wraps async functions with error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    errorMessage?: string
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        if (errorMessage) {
            toast.error(errorMessage);
        } else {
            handleError(error);
        }
        return null;
    }
}
