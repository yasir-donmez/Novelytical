import { AppError } from './types';
import { toast } from 'sonner';


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
