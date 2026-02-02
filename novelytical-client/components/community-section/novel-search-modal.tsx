'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';

interface Novel {
    id: string;
    title: string;
    coverImage?: string;
    coverUrl?: string; // Add this
    author?: string;
}

interface NovelSearchModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (novel: Novel) => void;
}

export function NovelSearchModal({ open, onClose, onSelect }: NovelSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Novel[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            // Use configured api client to ensure auth headers are attached
            const response = await api.get<{ data: Novel[] }>(`/novels?searchString=${encodeURIComponent(searchQuery)}`);

            // Axios returns the body in response.data
            // Backend returns { data: novels[], totalCount: number }
            setSearchResults(response.data.data || []);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectNovel = (novel: Novel) => {
        onSelect(novel);
        onClose();
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen size={20} className="text-primary" />
                        Kitap Seç
                    </DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Kitap adı ara..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setHasSearched(false);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1"
                    />
                    <Button onClick={handleSearch} disabled={loading} size="icon">
                        <Search size={18} />
                    </Button>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {loading && (
                        <div className="text-center py-8 text-muted-foreground">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                            Aranıyor...
                        </div>
                    )}

                    {!loading && hasSearched && searchResults.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            Sonuç bulunamadı
                        </div>
                    )}

                    {!loading && searchResults.map((novel) => (
                        <div
                            key={novel.id}
                            onClick={() => handleSelectNovel(novel)}
                            className="w-full flex gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group cursor-pointer"
                            role="button"
                            tabIndex={0}
                        >
                            {/* Cover Image */}
                            <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                                {(novel.coverImage || novel.coverUrl) ? (
                                    <Image
                                        src={novel.coverImage || novel.coverUrl!}
                                        alt={novel.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                                        <BookOpen size={20} className="text-primary/50" />
                                    </div>
                                )}
                            </div>

                            {/* Novel Info */}
                            <div className="flex-1 text-left min-w-0">
                                <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                    {novel.title}
                                </h4>
                                {novel.author && (
                                    <p className="text-xs text-muted-foreground truncate">{novel.author}</p>
                                )}
                            </div>

                            <Button size="sm" variant="ghost" className="shrink-0 pointer-events-none">
                                Seç
                            </Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
