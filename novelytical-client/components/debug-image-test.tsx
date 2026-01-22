'use client';

import { EnhancedImageLoader } from './enhanced-image-loader';
import { SimpleImageLoader } from './simple-image-loader';
import { useState } from 'react';

export function DebugImageTest() {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Gerçek test URL'leri
    const testUrls = [
        'https://novelfire.net/server-1/old-ancestor-thrown-out-by-the-nanny-from-the-start.jpg', // Gerçek RoyalRoad cover
        'https://invalid-domain-test.com/test.jpg', // Invalid domain test
        '/logo.png', // Local logo
        '', // Empty URL test
    ];

    return (
        <div className="p-4 bg-card rounded-lg border space-y-6">
            <h3 className="text-lg font-semibold">Image Loader Debug</h3>
            
            {/* Enhanced Image Loader Test */}
            <div>
                <h4 className="text-md font-medium mb-3">Enhanced Image Loader (Next.js)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {testUrls.map((url, index) => (
                        <div key={index} className="space-y-2">
                            <p className="text-xs text-muted-foreground truncate">
                                Test {index + 1}: {url || 'Empty URL'}
                            </p>
                            <div className="relative w-full aspect-[2/3] bg-muted rounded">
                                <EnhancedImageLoader
                                    src={url}
                                    alt={`Enhanced test ${index + 1}`}
                                    fill
                                    fallbackSrc="/images/book-placeholder.svg"
                                    className="rounded"
                                    onError={(error) => {
                                        addLog(`Enhanced ${index + 1} error: ${error.type} - ${error.message}`);
                                    }}
                                    onLoad={() => {
                                        addLog(`Enhanced ${index + 1} loaded successfully`);
                                    }}
                                    retryCount={1}
                                    unoptimized
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Simple Image Loader Test */}
            <div>
                <h4 className="text-md font-medium mb-3">Simple Image Loader (Native img)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {testUrls.map((url, index) => (
                        <div key={index} className="space-y-2">
                            <p className="text-xs text-muted-foreground truncate">
                                Test {index + 1}: {url || 'Empty URL'}
                            </p>
                            <div className="w-full aspect-[2/3] bg-muted rounded overflow-hidden">
                                <SimpleImageLoader
                                    src={url}
                                    alt={`Simple test ${index + 1}`}
                                    className="w-full h-full object-cover rounded"
                                    fallbackSrc="/images/book-placeholder.svg"
                                    onError={(error) => {
                                        addLog(`Simple ${index + 1} error: ${error.message}`);
                                    }}
                                    onLoad={() => {
                                        addLog(`Simple ${index + 1} loaded successfully`);
                                    }}
                                    retryCount={1}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Logs */}
            <div className="p-3 bg-muted/50 rounded max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium mb-2">Logs:</h4>
                {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No logs yet...</p>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log, index) => (
                            <p key={index} className="text-xs font-mono">{log}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}