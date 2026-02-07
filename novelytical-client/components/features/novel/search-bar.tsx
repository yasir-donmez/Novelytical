'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

// To avoid hydration mismatch or reuse logic, we keep the SearchBar logic simple:
// It reads from URL on mount/update to sync.
// It uses debounce for pushing to URL.

export interface SearchBarProps {
    variant?: 'hero' | 'navbar';
}

import { SearchMascot, MascotBorderOverlay } from './search-mascot';

// ... existing imports

export function SearchBar({ variant = 'hero' }: SearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
    const [isFocused, setIsFocused] = useState(false);
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
            setSearchInput(urlQ);
        }
    }, [searchParams.get('q')]);

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
    }, [debouncedSearch, router]);

    const handleClear = () => {
        setSearchInput('');
        // Clear all filters by navigating to novels page
        startTransition(() => {
            router.push('/romanlar');
        });
    };

    const isHero = variant === 'hero';
    const isTyping = isFocused || searchInput.length > 0;

    // Scale factor for mascots: Hero = 1, Navbar = 0.4
    const scale = isHero ? 1 : 0.4;

    return (
        <div className={`relative mx-auto group ${isHero ? 'max-w-2xl mt-12' : 'w-full max-w-sm'}`}>
            {/* Search Container */}
            <div className={`relative ai-search-input ${isHero ? 'ai-search-input-large' : ''} rounded-full z-0`}>
                <div className={`
                    relative z-10 bg-background/95 backdrop-blur-md rounded-full border-2 border-input transition-all duration-300 
                    focus-within:shadow-2xl
                    ${isHero ? '' : 'border-border/50 bg-muted/20'}
                `}>
                    <MascotBorderOverlay isVisible={isFocused} scale={scale} />
                    <Search className={`
                        absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110
                        ${isHero ? 'left-6 h-6 w-6' : 'left-3 h-4 w-4'}
                    `} />

                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={isHero ? "Hangi hikayeyi arıyorsun? (Örn: Ejderha binicisi)" : "Hikaye ara..."}
                        className={`
                            w-full rounded-full bg-transparent font-medium focus:outline-none placeholder:text-muted-foreground/60 transition-all relative z-30
                            ${isHero
                                ? 'pl-16 pr-16 py-5 text-lg'
                                : 'pl-10 pr-10 py-2 text-sm h-9'
                            }
                        `}
                    />

                    {(searchInput || hasActiveFilters) && (
                        <button
                            onClick={handleClear}
                            className={`
                                absolute top-1/2 -translate-y-1/2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all hover:scale-110
                                ${isHero
                                    ? 'right-4 p-2.5'
                                    : 'right-2 p-1'
                                }
                            `}
                            aria-label="Aramayı temizle"
                        >
                            <X className={isHero ? "h-5 w-5" : "h-3 w-3"} />
                        </button>
                    )}
                </div>
            </div>

            {/* Render Mascots only for Hero */}
            {isHero && (
                <div className="absolute bottom-[100%] right-8 z-30 pointer-events-none origin-bottom">
                    <SearchMascot isTyping={isTyping} isFocused={isFocused} scale={1} />
                </div>
            )}
        </div>
    );
}
