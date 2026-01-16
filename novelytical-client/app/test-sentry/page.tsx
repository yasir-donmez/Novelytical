'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function TestSentryPage() {
    const [message, setMessage] = useState('');

    const throwError = () => {
        try {
            console.log('🔵 Sentry DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);
            console.log('🔵 NODE_ENV:', process.env.NODE_ENV);
            console.log('🔵 Throwing error...');

            throw new Error('Test error from Novelytical - ' + new Date().toISOString());
        } catch (error) {
            console.log('🟡 Caught error, sending to Sentry...');
            const eventId = Sentry.captureException(error, {
                tags: {
                    test: 'manual-test',
                    page: 'test-sentry'
                }
            });
            console.log('🟢 Sentry Event ID:', eventId);
            setMessage(`✅ Hata Sentry'ye gönderildi! Event ID: ${eventId}\nPanel'i kontrol edin.`);
        }
    };

    const throwUnhandledError = () => {
        // Unhandled error - otomatik yakalanacak
        throw new Error('Unhandled test error - ' + new Date().toISOString());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 p-8">
            <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h1 className="text-4xl font-bold text-white mb-6">
                    🔍 Sentry Test Sayfası
                </h1>

                <div className="space-y-4 mb-6">
                    <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4 text-white">
                        <h3 className="font-bold mb-2">ℹ️ Bilgi:</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Environment: <code className="bg-black/30 px-2 py-1 rounded">{process.env.NODE_ENV || 'undefined'}</code></li>
                            <li>DSN Var mı: <code className="bg-black/30 px-2 py-1 rounded">{process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Evet' : '❌ Hayır'}</code></li>
                            <li>DSN (ilk 20 karakter): <code className="bg-black/30 px-2 py-1 rounded text-xs">{process.env.NEXT_PUBLIC_SENTRY_DSN?.slice(0, 20)}...</code></li>
                            <li className="text-yellow-300">⚠️ Browser Console&apos;u açın ve loglara bakın!</li>
                        </ul>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={throwError}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        🔥 Manuel Hata Gönder (Controlled)
                    </button>

                    <button
                        onClick={throwUnhandledError}
                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        💥 Unhandled Error Fırlat
                    </button>
                </div>

                {message && (
                    <div className="mt-6 bg-green-500/20 border border-green-400/50 rounded-lg p-4 text-white">
                        {message}
                    </div>
                )}

                <div className="mt-8 text-white/60 text-sm">
                    <p>⚠️ Bu sayfa sadece test içindir. Production&apos;a deploy etmeyin!</p>
                </div>
            </div>
        </div>
    );
}
