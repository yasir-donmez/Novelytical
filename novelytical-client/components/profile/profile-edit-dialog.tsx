
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { updateUserIdentityInReviews } from "@/services/review-service";
import { updateUserIdentityInComments } from "@/services/comment-service";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserService } from "@/services/user-service";
import { LevelService, LEVEL_FRAMES, UserLevelData } from "@/services/level-service";
import { updateUserIdentityInCommunityPosts } from "@/services/feed-service";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, AlertTriangle, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfileEditDialog() {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Username States
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [checkLoading, setCheckLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameSuccess, setUsernameSuccess] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");

    // Level & Frame States
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<string>("default");
    const [debugMode, setDebugMode] = useState(false); // To toggle XP cheat UI

    // Reset states when dialog opens
    useEffect(() => {
        if (open) {
            setDisplayName(user?.displayName || "");
            setPhotoURL(user?.photoURL || "");
            setUsernameError(null);
            setUsernameSuccess(false);
            setSuggestions([]);
            fetchLevelData();
        }
    }, [open, user]);

    // Early return moved down

    // Username check logic
    // Race condition tracking
    const lastCheckRef = useState<{ value: string }>({ value: "" })[0];

    // Username check logic
    const handleUsernameChange = async (value: string) => {
        if (!user) return;
        setDisplayName(value);
        setUsernameError(null);
        setUsernameSuccess(false);
        setSuggestions([]);

        if (!value.trim()) return;

        // Don't check if it's the same as current username
        if (value.trim() === user.displayName) return;

        // Update tracking ref
        lastCheckRef.value = value;
        const currentCheckValue = value;

        setCheckLoading(true);
        try {
            const isAvailable = await UserService.checkUsernameAvailability(value);

            // Race check: If user typed more since this request started, ignore result
            if (lastCheckRef.value !== currentCheckValue) return;

            if (!isAvailable) {
                setUsernameError("Bu kullanıcı adı zaten alınmış.");
                setUsernameSuccess(false);
                const rawSuggestions = await UserService.suggestUsernames(value);
                // Filter out suggestion if it's exactly what user typed (edge case)
                setSuggestions(rawSuggestions.filter(s => s !== currentCheckValue));
            } else {
                setUsernameSuccess(true);
                setUsernameError(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (lastCheckRef.value === currentCheckValue) {
                setCheckLoading(false);
            }
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Prevent submit if error
        if (usernameError) {
            toast.error("Lütfen geçerli bir kullanıcı adı seçin.");
            return;
        }

        setLoading(true);
        try {
            await updateProfile(user, {
                displayName: displayName,
                photoURL: photoURL
            });

            // Update user registry if username or photo changed
            if (displayName !== user.displayName || photoURL !== user.photoURL) {
                await UserService.updateUserProfile(user.uid, displayName, photoURL);
            }

            // Sync with past data (Fire and forget, or await if critical)
            // We await to ensure consistency before reload
            // We await to ensure consistency before reload
            await Promise.all([
                updateUserIdentityInReviews(user.uid, displayName, photoURL, selectedFrame),
                updateUserIdentityInComments(user.uid, displayName, photoURL, selectedFrame),
                updateUserIdentityInCommunityPosts(user.uid, displayName, photoURL, selectedFrame),
                LevelService.updateSelectedFrame(user.uid, selectedFrame)
            ]);

            toast.success("Profil bilgileriniz ve geçmiş etkileşimleriniz güncellendi.");

            // Notify app components
            window.dispatchEvent(new Event('user-profile-update'));

            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Profil güncellenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
        } catch (error) {
            console.error(error);
            toast.error("E-posta gönderilemedi. Lütfen tekrar deneyin.");
        }
    };

    const googleProvider = user?.providerData.find(p => p.providerId === 'google.com');
    const isGoogleUser = !!googleProvider;

    const hasChanges = displayName !== (user?.displayName || "") ||
        photoURL !== (user?.photoURL || "") ||
        selectedFrame !== (levelData?.selectedFrame || "default");

    const [avatarSeeds, setAvatarSeeds] = useState<string[]>([]);
    const [currentTab, setCurrentTab] = useState("select");

    const refreshAvatars = () => {
        const newSeeds = Array.from({ length: 9 }, () => Math.random().toString(36).substring(7));
        setAvatarSeeds(newSeeds);
    };

    // Initial load
    useEffect(() => {
        if (open && avatarSeeds.length === 0) {
            refreshAvatars();
        }
    }, [open]);

    const handleAvatarSelect = (seed: string) => {
        const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
        setPhotoURL(url);
    };

    const fetchLevelData = async () => {
        if (!user) return;
        const data = await LevelService.getUserLevelData(user.uid);
        if (data) {
            setLevelData(data);
            setSelectedFrame(data.selectedFrame || 'default');
        }
    };

    // Helper to calculate progress for UI
    const progress = levelData ? LevelService.getLevelProgress(levelData.xp) : { current: 0, next: 100, percent: 0 };

    const handleGainXp = async (amount: number) => {
        if (!user) return;
        try {
            setLoading(true);
            const result = await LevelService.gainXp(user.uid, amount);
            if (result) {
                toast.success(`You gained ${amount} XP! New Level: ${result.newLevel}`);
                fetchLevelData(); // Refresh data
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to add XP");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Profili Düzenle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Profili Düzenle</DialogTitle>
                    <DialogDescription>
                        Profil bilgilerinizi ve avatarınızı güncelleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
                            <TabsTrigger value="frames">Çerçeveler & Seviye</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6">
                            {/* 1. Profil Resmi Section */}
                            <div className="space-y-3">
                                <Label>Profil Resmi</Label>
                                <Tabs defaultValue="select" onValueChange={setCurrentTab} className="w-full">
                                    <TabsList className="inline-flex w-full justify-start h-auto p-1 bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-lg mb-3">
                                        <TabsTrigger value="select" className="flex-1 px-4">Avatar Seç</TabsTrigger>
                                        <TabsTrigger value="custom" className="flex-1 px-4">Özel URL</TabsTrigger>
                                    </TabsList>

                                    {/* Persistent Preview & URL Row */}
                                    <div className="flex gap-4 items-start mb-4">
                                        <div className="shrink-0">
                                            <div className="relative h-16 w-16 rounded-full border-2 border-border overflow-hidden bg-muted shadow-sm">
                                                <Image
                                                    src={photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`}
                                                    alt="Preview"
                                                    className="object-cover"
                                                    fill
                                                    sizes="64px"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                value={photoURL}
                                                onChange={(e) => setPhotoURL(e.target.value)}
                                                placeholder="https://..."
                                                className="rounded-lg font-mono text-xs"
                                                readOnly={currentTab === 'select'}
                                                disabled={currentTab === 'select'}
                                            />
                                            {currentTab === 'custom' ? (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Herhangi bir resim bağlantısı yapıştırabilirsiniz.
                                                </p>
                                            ) : (
                                                <div className="flex gap-2 mt-1">
                                                    {isGoogleUser && googleProvider?.photoURL && googleProvider.photoURL !== photoURL && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPhotoURL(googleProvider.photoURL!)}
                                                            className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                                                        >
                                                            Google Resmine Dön
                                                        </button>
                                                    )}
                                                    {photoURL && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPhotoURL("")}
                                                            className="text-[10px] text-red-500 hover:underline flex items-center gap-1"
                                                        >
                                                            Resmi Kaldır
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <TabsContent value="select" className="mt-0 space-y-4 animate-in fade-in-50">
                                        <div className="grid grid-cols-3 gap-3 min-h-[200px]">
                                            {avatarSeeds.map((seed, i) => {
                                                const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                                                const isSelected = photoURL === url;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleAvatarSelect(seed)}
                                                        className={`cursor-pointer rounded-xl p-2 border-2 transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/20' : 'border-transparent bg-muted/50 hover:bg-muted'}`}
                                                    >
                                                        <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                                                            <Image src={url} alt="Avatar Option" className="object-cover" fill sizes="100px" />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <Button type="button" variant="secondary" onClick={refreshAvatars} className="w-full gap-2 font-medium">
                                            <Loader2 className="h-4 w-4" />
                                            Farklı Karakterler Göster
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="custom" className="mt-0">
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* 2. Kullanıcı Adı Section */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Kullanıcı Adı</Label>
                                <div className="relative">
                                    <Input
                                        id="name"
                                        value={displayName}
                                        onChange={(e) => handleUsernameChange(e.target.value)}
                                        placeholder="Takma Adınız"
                                        className={cn(
                                            "rounded-lg pr-10",
                                            usernameError && "border-red-500 focus-visible:ring-red-500",
                                            usernameSuccess && "border-green-500 focus-visible:ring-green-500"
                                        )}
                                    />
                                    {checkLoading && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {usernameError && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {usernameError}
                                        </p>
                                        {suggestions.length > 0 && (
                                            <div className="bg-muted/50 p-3 rounded-lg border border-border">
                                                <p className="text-[10px] text-muted-foreground mb-2 font-medium">Önerilen Kullanıcı Adları:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestions.map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => handleUsernameChange(s)}
                                                            className="text-xs bg-background border hover:border-primary/50 px-2 py-1 rounded-md transition-colors text-foreground"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {usernameSuccess && (
                                    <p className="text-xs text-green-500 font-medium">Bu kullanıcı adı kullanılabilir.</p>
                                )}

                                <p className="text-[10px] text-muted-foreground">
                                    Novel yorumlarında ve değerlendirmelerde bu isim görünecek.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>E-posta</Label>
                                <Input value={user.email || ""} disabled className="bg-muted rounded-lg" />
                            </div>

                            {isGoogleUser && (
                                <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 rounded-lg">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Google Hesabı</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Google ile giriş yapıldı. Şifre işlemleri Google üzerinden yönetilir.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="pt-2 border-t border-border mt-4">
                                <Button type="button" variant="outline" onClick={handlePasswordReset} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                                    <Send className="h-3 w-3" />
                                    Şifre Sıfırlama Bağlantısı Gönder
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="frames" className="space-y-6 animate-in fade-in-50">
                            {/* Level Info */}
                            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-xl block">Seviye {levelData?.level || 1}</span>
                                        <span className="text-xs text-muted-foreground">Novelytical Kaşifi</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-mono font-medium text-lg">{levelData?.xp || 0} XP</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ease-out"
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wider">
                                    Sonraki seviye için {progress.next - progress.current} XP
                                </p>
                            </div>

                            {/* Frames Grid */}
                            <div className="space-y-3">
                                <Label>Çerçeve Seçimi</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {LEVEL_FRAMES.map((frame) => {
                                        const isUnlocked = levelData?.unlockedFrames?.includes(frame.id) || frame.minLevel === 0;
                                        const isSelected = selectedFrame === frame.id;

                                        return (
                                            <div
                                                key={frame.id}
                                                onClick={() => isUnlocked && setSelectedFrame(frame.id)}
                                                className={cn(
                                                    "relative group cursor-pointer rounded-xl p-3 border-2 transition-all flex flex-col items-center gap-2",
                                                    isSelected ? "border-purple-500 bg-purple-500/5 shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]" : "border-muted hover:border-muted-foreground/30 hover:bg-muted/30",
                                                    !isUnlocked && "opacity-50 grayscale cursor-not-allowed"
                                                )}
                                            >
                                                <div className={cn("relative h-14 w-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105", frame.cssClass)}>
                                                    {/* Avatar Preview inside Frame */}
                                                    <div className="absolute inset-[3px] rounded-full overflow-hidden bg-background">
                                                        <Image src={photoURL || user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`} className="object-cover" fill sizes="64px" alt="Avatar Frame" />
                                                    </div>
                                                </div>
                                                <span className={cn("text-xs font-bold", frame.color)}>{frame.name}</span>

                                                {!isUnlocked && (
                                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                                                        <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-1 rounded-full shadow-sm border border-white/10">
                                                            Lv. {frame.minLevel}
                                                        </span>
                                                    </div>
                                                )}

                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-sm" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Debug / Toggle */}
                            <div className="pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-xs text-muted-foreground">Test Araçları (Sadece Geliştirme)</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDebugMode(!debugMode)}
                                        className="h-6 text-[10px] hover:bg-muted"
                                    >
                                        {debugMode ? 'Gizle' : 'Göster'}
                                    </Button>
                                </div>

                                {debugMode && (
                                    <div className="bg-muted p-3 rounded-lg border border-border">
                                        <p className="text-[10px] mb-2 font-mono text-muted-foreground">XP kazanarak seviye atlamayı test edin:</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => handleGainXp(5)} className="text-xs h-8 bg-background">+5 XP</Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => handleGainXp(25)} className="text-xs h-8 bg-background">+25 XP</Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => handleGainXp(100)} className="text-xs h-8 bg-background">+100 XP</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={loading || !hasChanges} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
