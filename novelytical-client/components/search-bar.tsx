'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

// To avoid hydration mismatch or reuse logic, we keep the SearchBar logic simple:
// It reads from URL on mount/update to sync.
// It uses debounce for pushing to URL.

export function SearchBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
    const debouncedSearch = useDebounce(searchInput, 800);
    const [isPending, startTransition] = useTransition();

    // Check if any filter is active
    const tagFilters = searchParams.getAll('tag');
    const minChapters = searchParams.get('minChapters');
    const maxChapters = searchParams.get('maxChapters');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const hasActiveFilters = tagFilters.length > 0 || minChapters || maxChapters || minRating || maxRating;

    // Sync state with URL only if URL changes externally (and it's different from current input)
    // This is tricky with debouncing.
    // Best practice: Input drives the URL. URL drives the Input ONLY on initial load or navigation via back/forward.

    useEffect(() => {
        const urlQ = searchParams.get('q') || '';
        if (urlQ !== searchInput && urlQ !== debouncedSearch) {
            // Only sync if significantly different to avoid fighting?
            // Actually simpler: if URL changes, update input.
            // But if user is typing, URL hasn't changed yet (due to debounce).
            // So we check if we are NOT typing?
            // For now simple sync:
            setSearchInput(urlQ);
        }
    }, [searchParams.get('q')]); // Depend only on the query string value

    // To break the loop:
    // When router.push happens, searchParams updates.
    // We should track if update comes from our own push.
    // Actually, standard pattern:
    // 1. User types -> setInput
    // 2. Debounce -> effect triggers router.push
    // 3. User navigates back -> searchParams change -> setInput

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        const currentQuery = params.get('q') || '';

        if (debouncedSearch !== currentQuery) {
            if (debouncedSearch) {
                params.set('q', debouncedSearch);
            } else {
                params.delete('q');
            }

            params.delete('page');
            startTransition(() => {
                router.push(`/romanlar?${params.toString()}`, { scroll: false });
            });
        }
    }, [debouncedSearch, router]); // Remove searchParams from dep to avoid loop, we read current params inside.

    const handleClear = () => {
        setSearchInput('');
        // Clear all filters by navigating to novels page
        startTransition(() => {
            router.push('/romanlar');
        });
    };

    return (
        <div className="relative max-w-2xl mx-auto group">
            {/* Outer Glow Layer */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-purple-500/30 to-blue-500/30 rounded-full blur-xl opacity-0 group-focus-within:opacity-60 transition-all duration-500 animate-pulse"></div>

            {/* Search Container */}
            <div className="relative ai-search-input rounded-full">
                <div className="relative bg-background/95 backdrop-blur-md rounded-full border-2 border-input transition-all duration-300 focus-within:border-transparent focus-within:shadow-2xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />

                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Hangi hikayeyi arıyorsun? (Örn: Ejderha binicisi)"
                        className="w-full pl-16 pr-16 py-5 rounded-full bg-transparent text-lg font-medium focus:outline-none placeholder:text-muted-foreground/60 transition-all"
                    />

                    {(searchInput || hasActiveFilters) && (
                        <button
                            onClick={handleClear}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all hover:scale-110"
                            aria-label="Aramayı temizle"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
