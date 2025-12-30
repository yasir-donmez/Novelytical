import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { novelService } from "@/services/novelService"
import { Filter, Loader2, Tag, X } from "lucide-react"
import { useState, useEffect } from "react"

interface CategoryModalProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

export function CategoryModal({ selectedTags, onChange }: CategoryModalProps) {
    const [open, setOpen] = useState(false);

    // Ensure selectedTags is always an array
    const currentTags = Array.isArray(selectedTags) ? selectedTags : [];

    // Local state for buffering changes
    const [internalTags, setInternalTags] = useState<string[]>(currentTags);

    // Sync internal state with props only when modal opens
    useEffect(() => {
        if (open) {
            setInternalTags(currentTags);
        }
    }, [open, currentTags]);

    const { data: tags, isLoading } = useQuery({
        queryKey: ['tags'],
        queryFn: novelService.getTags,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const handleSelect = (tag: string) => {
        if (internalTags.includes(tag)) {
            // Remove tag locally
            setInternalTags(prev => prev.filter(t => t !== tag));
        } else {
            // Add tag locally
            setInternalTags(prev => [...prev, tag]);
        }
    }

    const handleApply = () => {
        onChange(internalTags);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-auto py-2 px-3 gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 hover:bg-primary/5 max-w-[300px]">
                    <Filter className="h-4 w-4 shrink-0" />
                    {currentTags.length > 0 ? (
                        <span className="font-semibold text-primary">
                            {currentTags.length} Kategori
                        </span>
                    ) : (
                        "Kategori Seç"
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Tag className="h-6 w-6 text-primary" />
                        Kategoriler & Etiketler
                    </DialogTitle>
                    <DialogDescription>
                        İlginizi çeken türleri seçin. "Uygula" demeden aktif olmaz.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {tags?.map((tag) => {
                                const isSelected = internalTags.includes(tag);
                                return (
                                    <Button
                                        key={tag}
                                        variant={isSelected ? "default" : "outline"}
                                        className={`
                                            justify-start h-auto py-3 px-4 text-left transition-all hover:scale-105
                                            ${isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'}
                                        `}
                                        onClick={() => handleSelect(tag)}
                                    >
                                        <span className="truncate">{tag}</span>
                                        {isSelected && <Tag className="ml-auto h-3 w-3 opacity-50" />}
                                    </Button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-muted/40 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {internalTags.length > 0 ? (
                            <>
                                <span className="font-medium text-foreground">{internalTags.length}</span> kategori seçildi
                            </>
                        ) : (
                            "Kategori seçilmedi"
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setInternalTags([])}
                            className="text-muted-foreground hover:text-destructive gap-2"
                        >
                            <X className="h-4 w-4" />
                            Seçimi Temizle
                        </Button>
                        <Button onClick={handleApply} className="gap-2 px-8">
                            Uygula
                            {internalTags.length > 0 && <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">{internalTags.length}</Badge>}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
