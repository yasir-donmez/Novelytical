import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ReadingStatus, updateLibraryStatus, getLibraryItem, updateLibraryProgress } from "@/services/library-service";
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
    chapterCount?: number;
}

export default function LibraryAction({ novelId, chapterCount }: LibraryActionProps) {
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
            const item = await getLibraryItem(user.uid, novelId);
            setStatus(item ? item.status : null);
            const chap = item?.currentChapter || 0;
            setCurrentChapter(chap);
            setInputValue(chap.toString());
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
            // When updating status, preserve currentChapter if exists, or init to 0 if reading
            const chapterToSave = newStatus === 'reading' ? (currentChapter || 0) : currentChapter;

            await updateLibraryStatus(user.uid, novelId, newStatus, chapterToSave);

            if (newStatus === null) {
                toast.success("Listeden çıkarıldı.");
                setCurrentChapter(0);
                setInputValue("0");
            } else {
                const messages: Record<string, string> = {
                    'reading': 'Okuma listenize eklendi.',
                    'completed': 'Okuduklarınız arasına eklendi.',
                    'plan_to_read': 'Okunacaklar listenize eklendi.'
                };
                toast.success(messages[newStatus]);
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

        const max = chapterCount || Infinity;
        if (newChapter > max) newChapter = max;

        setCurrentChapter(newChapter);
        setInputValue(newChapter.toString());

        try {
            await updateLibraryProgress(user.uid, novelId, newChapter);
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
            case 'reading': return `Okuyorum ${currentChapter > 0 ? `(${currentChapter}. Bölüm)` : ''}`;
            case 'completed': return 'Okudum';
            case 'plan_to_read': return 'Okuyacağım';
            default: return 'Listeye Ekle';
        }
    };

    const getStatusIcon = () => {
        const iconClass = "w-4 h-4 mr-2 transition-all"; // specific hover fill removed
        switch (status) {
            case 'reading': return <BookOpen className={iconClass} />;
            case 'completed': return <Check className={iconClass} />;
            case 'plan_to_read': return <Calendar className={iconClass} />;
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
                        status === 'reading' && "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30",
                        status === 'completed' && "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30",
                        status === 'plan_to_read' && "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30",
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
                {status === 'reading' && (
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
                        handleUpdate('reading');
                    }}
                    className="gap-2 cursor-pointer"
                >
                    <BookOpen className="w-4 h-4 text-blue-500" /> Okuyorum
                    {status === 'reading' && <Check className="w-3 h-3 ml-auto opacity-50" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate('completed')} className="gap-2 cursor-pointer">
                    <Check className="w-4 h-4 text-green-500" /> Okudum
                    {status === 'completed' && <Check className="w-3 h-3 ml-auto opacity-50" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate('plan_to_read')} className="gap-2 cursor-pointer">
                    <Calendar className="w-4 h-4 text-amber-500" /> Okuyacağım
                    {status === 'plan_to_read' && <Check className="w-3 h-3 ml-auto opacity-50" />}
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
