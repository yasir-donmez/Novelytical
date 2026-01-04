import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googleapis.com https://www.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "frame-src 'self' https://accounts.google.com https://novelytical.firebaseapp.com; " +
        "connect-src 'self' http://localhost:5050 http://localhost:3000 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com;"
    );

    // CORS headers (allow backend API)
    if (request.method === 'OPTIONS') {
        response.headers.set('Access-Control-Allow-Origin', 'http://localhost:5050');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Placeholder for future auth middleware
    // TODO: Implement JWT/HttpOnly cookie validation in Phase 4
    // const token = request.cookies.get('auth-token');
    // if (!token && request.nextUrl.pathname.startsWith('/protected')) {
    //   return NextResponse.redirect(new URL('/login', request.url));
    // }

    return response;
}

// Configure which routes to apply middleware to
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
