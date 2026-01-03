/**
 * Custom error types for the application
 * These provide better error classification and handling
 */

export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NetworkError extends AppError {
    constructor(message = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.') {
        super(message, 'NETWORK_ERROR', 0, true);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'İçerik') {
        super(`${resource} bulunamadı`, 'NOT_FOUND', 404, true);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400, true);
    }
}

export class ServerError extends AppError {
    constructor(message = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.') {
        super(message, 'SERVER_ERROR', 500, false);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Bu işlem için yetkiniz yok.') {
        super(message, 'UNAUTHORIZED', 401, true);
    }
}
