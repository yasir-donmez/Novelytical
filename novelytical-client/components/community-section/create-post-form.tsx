'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MentionInput, MentionUser } from './mention-input';
import { BarChart2, BookOpen, Send } from 'lucide-react';
import { NovelSearchModal } from './novel-search-modal';
import Image from 'next/image';

interface PollOptionData {
    text: string;
    novelId?: string;
    novelTitle?: string;
    novelCover?: string;
}

interface CreatePostFormProps {
    user: any;
    onPostCreate: (content: string, isPoll: boolean, options: PollOptionData[]) => Promise<void>;
    knownUsers: MentionUser[];
}

export function CreatePostForm({ user, onPostCreate, knownUsers }: CreatePostFormProps) {
    const [postContent, setPostContent] = useState('');
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<PollOptionData[]>([{ text: '' }, { text: '' }]);
    const [optionCount, setOptionCount] = useState<2 | 3 | 4>(2);
    const [novelSearchOpen, setNovelSearchOpen] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

    const handleSubmit = async () => {
        await onPostCreate(postContent, isPoll, pollOptions);
        setPostContent('');
        setIsPoll(false);
        setOptionCount(2);
        setPollOptions([{ text: '' }, { text: '' }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="px-2 pb-2 pt-0 relative z-20">
            <div className="flex flex-col gap-2 relative">
                {isPoll && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                <BarChart2 size={12} className="text-primary" /> Anket Oluştur
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => {
                                setIsPoll(false);
                                setOptionCount(2);
                                setPollOptions([{ text: '' }, { text: '' }]);
                            }}>×</Button>
                        </div>

                        {/* Option Count Selector */}
                        <div className="flex gap-1 mb-2">
                            <span className="text-[10px] text-muted-foreground self-center mr-1">Seçenek:</span>
                            {([2, 3, 4] as const).map((count) => (
                                <button
                                    key={count}
                                    onClick={() => {
                                        setOptionCount(count);
                                        const newOpts = Array(count).fill(null).map((_, i) => pollOptions[i] || { text: '' });
                                        setPollOptions(newOpts);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${optionCount === count
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    {!opt.novelId ? (
                                        /* Text Input Mode */
                                        <div className="flex gap-1.5">
                                            <Input
                                                placeholder={`${idx + 1}. Seçenek ${idx === 0 ? '(metin veya kitap)' : ''}`}
                                                value={opt.text}
                                                onChange={(e) => {
                                                    const newOpts = [...pollOptions];
                                                    newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                                    setPollOptions(newOpts);
                                                }}
                                                className="flex-1 h-8 text-[11px] bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedOptionIndex(idx);
                                                    setNovelSearchOpen(true);
                                                }}
                                                className="shrink-0 text-[10px] h-8 px-2"
                                            >
                                                <BookOpen size={12} className="mr-1" />
                                                Kitap
                                            </Button>
                                        </div>
                                    ) : (
                                        /* Novel Preview Mode */
                                        <div className="flex items-center gap-2 p-1.5 bg-primary/5 rounded-md border border-primary/20 group">
                                            {opt.novelCover && (
                                                <div className="relative w-6 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                                                    <Image src={opt.novelCover || ""} alt={opt.novelTitle || ""} className="object-cover" fill sizes="24px" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-medium truncate text-foreground">{opt.novelTitle}</div>
                                                <div className="text-[9px] text-muted-foreground">Kitap seçildi</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    const newOpts = [...pollOptions];
                                                    newOpts[idx] = { text: '' }; // Reset to empty text option
                                                    setPollOptions(newOpts);
                                                }}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="relative flex items-end gap-2 bg-zinc-900/50 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-lg ring-1 ring-black/20">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 shrink-0 rounded-full transition-all ${isPoll ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                        onClick={() => setIsPoll(!isPoll)}
                        title="Anket ekle"
                    >
                        <BarChart2 size={18} />
                    </Button>

                    <div className="flex-1 min-w-0">
                        <MentionInput
                            value={postContent}
                            onChange={setPostContent}
                            onSubmit={handleSubmit}
                            users={knownUsers}
                            placeholder={user ? "Düşüncelerini paylaş... (@etkileşim)" : "Giriş yaparak tartışmaya katıl..."}
                            className="min-h-[40px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 resize-none py-2.5 text-sm shadow-none"
                            minHeight="40px"
                        />
                    </div>

                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all shadow-lg shadow-purple-900/20"
                        disabled={(!postContent.trim() && !isPoll) || !user}
                        onClick={handleSubmit}
                    >
                        <Send size={16} className="ml-0.5" />
                    </Button>
                </div>
            </div>

            <NovelSearchModal
                open={novelSearchOpen}
                onClose={() => setNovelSearchOpen(false)}
                onSelect={(novel) => {
                    if (selectedOptionIndex !== null) {
                        const newOpts = [...pollOptions];
                        newOpts[selectedOptionIndex] = {
                            text: novel.title, // Fallback text
                            novelId: novel.id,
                            novelTitle: novel.title,
                            novelCover: novel.coverUrl
                        };
                        setPollOptions(newOpts);
                        setNovelSearchOpen(false);
                    }
                }}
            />
        </div>
    );
}
