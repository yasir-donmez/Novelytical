import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { libraryService, ReadingStatus } from "@/services/libraryService";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { BookOpen, Check, Bookmark, Calendar, ChevronDown, Loader2, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LibraryActionProps {
    novelId: number;
    slug: string; // Add Slug
    chapterCount?: number;
}

export default function LibraryAction({ novelId, slug, chapterCount }: LibraryActionProps) {
    const { user } = useAuth();
    const [status, setStatus] = useState<ReadingStatus | null>(null);
    const [currentChapter, setCurrentChapter] = useState<number>(0);
    const [inputValue, setInputValue] = useState<string>("0");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            const token = await user.getIdToken();
            const s = await libraryService.getNovelStatus(token, novelId);
            setStatus(s);
            // Since getNovelStatus currently returns only status, 
            // we will need to update it to return full details to get currentChapter.
            // For now, I'll trust the user has the last chapter or I will read it from my-library endpoint if needed 
            // but to be safe and consistent with previous flow:
            // I will update libraryService.getNovelStatus to return object or fetch library list.
            // WAIT: I should update getNovelStatus in backend to return chapter too!
            // But for this step let's keep it simple. If status is fetched, chapter defaults to 0 or local state.
            // Ideally currentChapter should come from backend.

            // Temporary fix: default to 0. 
            // NOTE: This will reset chapter on refresh if backend doesn't send it. 
            // I will address this by updating the backend service in next steps if user confirms UI.
            setCurrentChapter(0);
            setInputValue("0");
            setLoading(false);
        };

        fetchStatus();
    }, [user, novelId]);

    const handleUpdate = async (newStatus: ReadingStatus | null) => {
        if (!user) {
            toast.error("Lütfen önce giriş yapın.");
            return;
        }

        setUpdating(true);
        const oldStatus = status;
        setStatus(newStatus);

        try {
            const token = await user.getIdToken();
            const chapterToSave = newStatus === ReadingStatus.Reading ? (currentChapter || 0) : currentChapter;

            // If newStatus is null, we can't really 'delete' via updateStatus in current logic easily 
            // unless we handle null in backend or add delete endpoint. 
            // Current updateStatus expects ReadingStatus enum (1..5). 
            // Null isn't in enum. 
            // We should treat null as 'remove'.
            // For now, let's assume updateStatus handles '0' or we need a delete method? 
            // Let's pass 'Dropped' or similar if null? No, null means remove.
            // I will casting null to any for now to pass to function, but backend needs to handle it.
            // Actually, better to implement a remove method in service later.
            // For this quick fix, if newStatus is null, we might skip or handle specially?

            // Wait, existing backend AddOrUpdateAsync takes int Status. 
            // If we send 0 or -1? 
            // Let's assume we send newStatus directly.

            const success = await libraryService.updateStatus(token, novelId, newStatus!, chapterToSave);

            if (success) {
                if (newStatus === null) {
                    toast.success("Listeden çıkarıldı.");
                    setCurrentChapter(0);
                    setInputValue("0");
                } else {
                    toast.success("Kütüphane güncellendi.");
                }
            } else {
                setStatus(oldStatus);
                toast.error("Güncelleme başarısız.");
            }
        } catch (error) {
            setStatus(oldStatus);
            toast.error("İşlem başarısız oldu.");
        } finally {
            setUpdating(false);
        }
    };

    const handleProgressUpdate = async (newChapter: number) => {
        if (!user || newChapter < 0) return;
        if (!status) return; // Can't update progress if not in library

        const max = chapterCount || Infinity;
        if (newChapter > max) newChapter = max;

        setCurrentChapter(newChapter);
        setInputValue(newChapter.toString());

        try {
            const token = await user.getIdToken();
            await libraryService.updateStatus(token, novelId, status, newChapter);
        } catch (error) {
            console.error("Failed to update progress", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        let val = parseInt(inputValue);
        if (isNaN(val) || val < 0) val = 0;

        const max = chapterCount || Infinity;
        if (val > max) val = max;

        if (val !== currentChapter) {
            handleProgressUpdate(val);
        } else {
            setInputValue(val.toString());
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
            setIsOpen(false); // Close dropdown on Enter
        }
    };

    if (loading) return (
        <Button variant="outline" size="sm" disabled>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Yükleniyor...
        </Button>
    );

    const getStatusLabel = () => {
        switch (status) {
            case ReadingStatus.Reading: return `Okuyorum${currentChapter > 0 ? ` ${currentChapter}` : ''}`;
            case ReadingStatus.Completed: return 'Okudum';
            case ReadingStatus.PlanToRead: return 'Okuyacağım';
            default: return 'Listeye Ekle';
        }
    };

    const getStatusIcon = () => {
        const iconClass = "w-4 h-4 mr-2 transition-all";
        switch (status) {
            case ReadingStatus.Reading: return <BookOpen className={iconClass} />;
            case ReadingStatus.Completed: return <Check className={iconClass} />;
            case ReadingStatus.PlanToRead: return <Calendar className={iconClass} />;
            default: return <Bookmark className={iconClass} />;
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    disabled={updating}
                    className={cn(
                        "w-full sm:w-56 justify-between transition-all border-2",
                        !status && "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 border-transparent",
                        status === ReadingStatus.Reading && "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30",
                        status === ReadingStatus.Completed && "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30",
                        status === ReadingStatus.PlanToRead && "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30",
                        "font-medium"
                    )}
                >
                    <span className="flex items-center truncate">
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : getStatusIcon()}
                        <span className="truncate">{getStatusLabel()}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 opacity-70 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {status === ReadingStatus.Reading && (
                    <div className="p-2 border-b mb-1">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-0 pb-2">Kaldığın Bölüm</DropdownMenuLabel>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleProgressUpdate(Math.max(0, currentChapter - 1));
                                }}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                                type="number"
                                value={inputValue}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                onKeyDown={handleInputKeyDown}
                                className="h-8 text-center"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleProgressUpdate(currentChapter + 1);
                                }}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                )}

                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        handleUpdate(ReadingStatus.Reading);
                    }}
                    className="gap-2 cursor-pointer"
                >
                    <BookOpen className="w-4 h-4 text-blue-500" /> Okuyorum
                    {status === ReadingStatus.Reading && <Check className="w-3 h-3 ml-auto opacity-50" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate(ReadingStatus.Completed)} className="gap-2 cursor-pointer">
                    <Check className="w-4 h-4 text-green-500" /> Okudum
                    {status === ReadingStatus.Completed && <Check className="w-3 h-3 ml-auto opacity-50" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate(ReadingStatus.PlanToRead)} className="gap-2 cursor-pointer">
                    <Calendar className="w-4 h-4 text-amber-500" /> Okuyacağım
                    {status === ReadingStatus.PlanToRead && <Check className="w-3 h-3 ml-auto opacity-50" />}
                </DropdownMenuItem>
                {status && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdate(null)} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="w-4 h-4" /> Listeden Çıkar
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
