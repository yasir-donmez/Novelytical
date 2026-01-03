import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { novelService } from "@/services/novelService"
import { Filter, Tag, X, CircleMinus, CirclePlus } from "lucide-react"
import { useState, useEffect } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface CategoryModalProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

export function CategoryModal({ selectedTags, onChange }: CategoryModalProps) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

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
        const negativeTag = `-${tag}`;

        if (internalTags.includes(tag)) {
            // Remove positive
            setInternalTags(prev => prev.filter(t => t !== tag));
        } else if (internalTags.includes(negativeTag)) {
            // Remove negative
            setInternalTags(prev => prev.filter(t => t !== negativeTag));
        } else {
            // Add positive
            setInternalTags(prev => [...prev, tag]);
        }
    }

    const toggleNegative = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const negativeTag = `-${tag}`;

        if (internalTags.includes(tag)) {
            // Switch Positive -> Negative
            setInternalTags(prev => prev.map(t => t === tag ? negativeTag : t));
        } else if (internalTags.includes(negativeTag)) {
            // Switch Negative -> Positive
            setInternalTags(prev => prev.map(t => t === negativeTag ? tag : t));
        }
    }

    const handleApply = () => {
        onChange(internalTags);
        setOpen(false);
    }

    // Shared Content Component
    const CategoryList = ({ className }: { className?: string }) => (
        <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
            {isLoading ? (
                Array.from({ length: 16 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))
            ) : (
                tags?.map((tag) => {
                    const isPositive = internalTags.includes(tag);
                    const isNegative = internalTags.includes(`-${tag}`);
                    const isSelected = isPositive || isNegative;

                    return (
                        <div key={tag} className="relative group">
                            <Button
                                variant={isNegative ? "destructive" : (isPositive ? "default" : "outline")}
                                className={cn(
                                    "justify-between h-auto min-h-[3.5rem] py-3 pl-4 pr-3 text-left transition-all whitespace-normal break-words w-full",
                                    isPositive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary ring-offset-2 scale-[1.02]"
                                        : "",
                                    isNegative
                                        ? "ring-2 ring-destructive ring-offset-2 scale-[1.02]"
                                        : "",
                                    !isSelected && "hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => handleSelect(tag)}
                            >
                                <span className="text-sm leading-tight line-clamp-2">
                                    {tag}
                                </span>

                                {/* Toggle Negative Button (Integrated into the right side) */}
                                {isSelected && (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className={cn(
                                            "ml-2 rounded-full p-1 hover:bg-black/20 dark:hover:bg-white/20 transition-colors shrink-0",
                                            isNegative ? "text-destructive-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"
                                        )}
                                        onClick={(e) => toggleNegative(tag, e)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                toggleNegative(tag, e as any);
                                            }
                                        }}
                                        title={isPositive ? "Hariç Tut (Negatif Yap)" : "Dahil Et (Pozitif Yap)"}
                                    >
                                        {isPositive ? (
                                            <CircleMinus className="h-5 w-5" />
                                        ) : (
                                            <CirclePlus className="h-5 w-5" />
                                        )}
                                    </div>
                                )}
                            </Button>
                        </div>
                    )
                })
            )}
        </div>
    );

    // Trigger Button (Same for both)
    const triggerButton = (
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
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {triggerButton}
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
                        <CategoryList className="md:grid-cols-3" />
                    </div>

                    <div className="px-6 py-4 border-t bg-muted/40 flex justify-end">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="ghost"
                                onClick={() => setInternalTags([])}
                                className="flex-1 sm:flex-none text-muted-foreground hover:text-destructive gap-2 h-10 px-4"
                            >
                                <X className="h-4 w-4" />
                                Temizle
                            </Button>
                            <Button onClick={handleApply} className="flex-1 sm:flex-none gap-2 px-8 h-10">
                                Uygula
                                {internalTags.length > 0 && <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">{internalTags.length}</Badge>}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Drawer
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {triggerButton}
            </DrawerTrigger>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="text-left border-b pb-4">
                    <DrawerTitle className="flex items-center gap-2 text-xl">
                        <Tag className="h-5 w-5 text-primary" />
                        Kategoriler & Etiketler
                    </DrawerTitle>
                    <DrawerDescription>
                        İstediğiniz türleri seçip aşağıdan uygulayın.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="p-4 overflow-y-auto">
                    <CategoryList />
                </div>

                <DrawerFooter className="pt-2 border-t bg-muted/20">
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={() => setInternalTags([])}
                            className="flex-1 gap-2"
                        >
                            <X className="h-4 w-4" />
                            Temizle
                        </Button>
                        <Button onClick={handleApply} className="flex-[2] gap-2">
                            Uygula
                            {internalTags.length > 0 && <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">{internalTags.length}</Badge>}
                        </Button>
                    </div>
                    <DrawerClose asChild>
                        <Button variant="ghost">Vazgeç</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

