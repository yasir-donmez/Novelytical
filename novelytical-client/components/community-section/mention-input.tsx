'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export interface MentionUser {
    id: string;
    username: string;
    image?: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    users: MentionUser[];
    placeholder?: string;
    className?: string;
    minHeight?: string;
}

export function MentionInput({ value, onChange, onSubmit, users, placeholder, className, minHeight = "100px" }: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
    const [filterText, setFilterText] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Filter users based on input
    useEffect(() => {
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            const filtered = users.filter(u =>
                u.username.toLowerCase().includes(lowerFilter)
            ).slice(0, 5); // Limit to 5 suggestions
            setFilteredUsers(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [filterText, users]);

    // Reset suggestions if value is cleared externally
    useEffect(() => {
        if (!value) {
            setFilterText('');
            setShowSuggestions(false);
        }
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = newValue.slice(0, cursorPosition);
        const lastWord = textBeforeCursor.split(/\s/).pop();

        if (lastWord && lastWord.startsWith('@')) {
            const query = lastWord.slice(1);
            setFilterText(query);

            // Calculate position for suggestions (simplified approximation)
            // In a real robust app, we'd use a hidden div to mirror coordinates
            // For now, we'll position reasonably relative to the textarea
            // or just use fixed positioning for simplicity in this context

            // We'll just show it absolute relative to container for now
            // Improving positioning is complex without a library
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelectUser = (user: MentionUser) => {
        const cursorPosition = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);

        const lastWordStart = textBeforeCursor.lastIndexOf('@');

        if (lastWordStart !== -1) {
            const newTextBefore = textBeforeCursor.slice(0, lastWordStart) + `@${user.username} `;
            const newValue = newTextBefore + textAfterCursor;
            onChange(newValue);
            setShowSuggestions(false);

            // Restore focus and cursor
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newTextBefore.length, newTextBefore.length);
                }
            }, 0);
        }
    };

    return (
        <div className="relative w-full">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
                        e.preventDefault();
                        onSubmit();
                    }
                }}
                placeholder={placeholder}
                className={cn("w-full resize-none bg-background/50 border-primary/20 focus:border-primary/50", className)}
                style={{ minHeight }}
            />

            {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute z-50 w-64 bottom-full mb-2 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        {filteredUsers.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleSelectUser(user)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors text-left"
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback className="text-[10px]">{user.username[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate text-popover-foreground">{user.username}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
