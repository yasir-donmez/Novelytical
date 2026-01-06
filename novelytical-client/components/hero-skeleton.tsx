import React from 'react';

export default function HeroSkeleton() {
    return (
        <div className="h-[50vh] flex items-center justify-center bg-muted animate-pulse rounded-b-2xl">
            <div className="w-11/12 max-w-4xl">
                <div className="h-6 bg-slate-300 rounded w-1/3 mb-4" />
                <div className="h-10 bg-slate-300 rounded w-2/3 mb-2" />
                <div className="h-4 bg-slate-300 rounded w-1/2 mt-6" />
            </div>
        </div>
    );
}
