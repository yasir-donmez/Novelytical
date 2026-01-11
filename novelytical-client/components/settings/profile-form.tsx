"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import { updateUserIdentityInReviews } from "@/services/review-service";
import { updateUserIdentityInComments } from "@/services/comment-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserService } from "@/services/user-service";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { updateUserIdentityInCommunityPosts } from "@/services/feed-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Lock, Trophy, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ProfileForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Level Data
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);

    // Username States
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [checkLoading, setCheckLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameSuccess, setUsernameSuccess] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Photo & Frame
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
    const [selectedFrame, setSelectedFrame] = useState<string>("default");

    // Race condition tracking for username
    const lastCheckRef = useState<{ value: string }>({ value: "" })[0];

    // Avatar Selection
    const [avatarSeeds, setAvatarSeeds] = useState<string[]>([]);
    const [currentTab, setCurrentTab] = useState("select");

    const refreshAvatars = () => {
        const newSeeds = Array.from({ length: 9 }, () => Math.random().toString(36).substring(7));
        setAvatarSeeds(newSeeds);
    };

    // Debug / XP Cheat
    const [debugMode, setDebugMode] = useState(false);
    const handleGainXp = async (amount: number) => {
        if (!user) return;
        try {
            setLoading(true);
            const result = await LevelService.gainXp(user.uid, amount);
            if (result) {
                toast.success(`${amount} XP kazanıldı! Yeni Seviye: ${result.newLevel}`);
                // Refresh level data
                const data = await LevelService.getUserLevelData(user.uid);
                setLevelData(data);
                if (data.selectedFrame) setSelectedFrame(data.selectedFrame);
            }
        } catch (e) {
            toast.error("XP eklenemedi");
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (!user) return;

        setDisplayName(user.displayName || "");
        setPhotoURL(user.photoURL || "");
        refreshAvatars();

        // Load Level Data
        const loadLevelData = async () => {
            const data = await LevelService.getUserLevelData(user.uid);
            setLevelData(data);
            if (data.selectedFrame) {
                setSelectedFrame(data.selectedFrame);
            }
        };
        loadLevelData();

    }, [user]);

    const handleUsernameChange = async (value: string) => {
        setDisplayName(value);
        setUsernameError(null);
        setUsernameSuccess(false);
        setSuggestions([]);

        if (!value.trim()) return;
        if (value.trim() === user?.displayName) return;

        lastCheckRef.value = value;
        const currentCheckValue = value;

        setCheckLoading(true);
        try {
            const isAvailable = await UserService.checkUsernameAvailability(value);
            if (lastCheckRef.value !== currentCheckValue) return;

            if (!isAvailable) {
                setUsernameError("Bu kullanıcı adı alınmış.");
                const rawSuggestions = await UserService.suggestUsernames(value);
                setSuggestions(rawSuggestions.filter(s => s !== currentCheckValue));
            } else {
                setUsernameSuccess(true);
            }
        } finally {
            if (lastCheckRef.value === currentCheckValue) setCheckLoading(false);
        }
    };

    const handleAvatarSelect = (seed: string) => {
        const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
        setPhotoURL(url);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (usernameError) {
            toast.error("Geçerli bir kullanıcı adı giriniz.");
            return;
        }

        setLoading(true);
        try {
            await updateProfile(user, { displayName, photoURL });

            if (displayName !== user.displayName || photoURL !== user.photoURL) {
                await UserService.updateUserProfile(user.uid, displayName, photoURL);
            }

            // Frame update
            if (levelData && selectedFrame !== levelData.selectedFrame) {
                await LevelService.updateSelectedFrame(user.uid, selectedFrame);
            }

            await Promise.all([
                updateUserIdentityInReviews(user.uid, displayName, photoURL, selectedFrame),
                updateUserIdentityInComments(user.uid, displayName, photoURL, selectedFrame),
                updateUserIdentityInCommunityPosts(user.uid, displayName, photoURL, selectedFrame)
            ]);

            // Notify app components
            window.dispatchEvent(new Event('user-profile-update'));

            toast.success("Profil güncellendi!");
        } catch (error) {
            console.error(error);
            toast.error("Hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to get frame object
    const currentFrameObj = LEVEL_FRAMES.find(f => f.id === selectedFrame) || LEVEL_FRAMES[0];

    const googleProvider = user?.providerData.find(p => p.providerId === 'google.com');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Profil Bilgileri</h3>
                <p className="text-sm text-muted-foreground">Herkesin göreceği profil bilgilerinizi buradan yönetin.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Avatar & Frame Selection */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="shrink-0 flex flex-col items-center gap-3">
                        {/* Preview with Frame */}
                        <div className={cn(
                            "h-32 w-32 rounded-full flex items-center justify-center transition-all relative group shadow-sm border-[4px]",
                            currentFrameObj.cssClass
                        )}>
                            <div className="absolute inset-[4px] rounded-full overflow-hidden bg-zinc-900">
                                <img
                                    src={photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <Badge variant="outline" className={cn("mt-1", currentFrameObj.color)}>
                            {currentFrameObj.name}
                        </Badge>

                        {/* Level Info */}
                        <div className="w-full max-w-[200px] space-y-2 mt-2 bg-black/20 p-2 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center text-xs font-medium">
                                <span className={cn("flex gap-1 items-center font-bold", currentFrameObj.color)}>
                                    <Trophy className="w-3 h-3" /> Lv. {levelData?.level || 1}
                                </span>
                                <span className="text-muted-foreground">{levelData?.xp || 0} XP</span>
                            </div>
                            <Progress
                                value={levelData ? LevelService.getLevelProgress(levelData.xp).percent : 0}
                                className="h-1.5"
                            />
                            <p className="text-[10px] text-center text-muted-foreground">
                                Sonraki: {levelData ? LevelService.getLevelProgress(levelData.xp).next - (levelData.xp % 25) : 25} XP
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-6">
                        {/* Avatar Tabs */}
                        <div className="space-y-3">
                            <Label>Avatar Değiştir</Label>
                            <Tabs defaultValue="select" onValueChange={setCurrentTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="select">Karakter Seç</TabsTrigger>
                                    <TabsTrigger value="custom">URL Yapıştır</TabsTrigger>
                                </TabsList>
                                <TabsContent value="select" className="mt-4">
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                        {avatarSeeds.map((seed, i) => (
                                            <div key={i} onClick={() => handleAvatarSelect(seed)}
                                                className={cn(
                                                    "cursor-pointer rounded-lg p-1 border-2 aspect-square hover:bg-muted/50 transition-all",
                                                    photoURL.includes(seed) ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                                )}>
                                                <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`} className="w-full h-full rounded" />
                                            </div>
                                        ))}
                                        <Button type="button" variant="ghost" onClick={refreshAvatars} className="w-full h-full aspect-square border-2 border-dashed hover:border-primary hover:text-primary transition-all">
                                            <Loader2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TabsContent>
                                <TabsContent value="custom">
                                    <Input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." />
                                    {googleProvider?.photoURL && googleProvider.photoURL !== photoURL && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setPhotoURL(googleProvider.photoURL!)}
                                            className="w-full mt-2 text-xs"
                                        >
                                            <Zap className="w-3 h-3 mr-2" />
                                            Google Profil Resmine Dön
                                        </Button>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Frame Selection */}
                        <div className="space-y-3">
                            <Label>Çerçeve Seçimi</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {LEVEL_FRAMES.map(frame => {
                                    const isUnlocked = levelData?.unlockedFrames?.includes(frame.id) || frame.minLevel === 0;
                                    const isSelected = selectedFrame === frame.id;

                                    return (
                                        <div
                                            key={frame.id}
                                            onClick={() => isUnlocked && setSelectedFrame(frame.id)}
                                            className={cn(
                                                "relative group flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer",
                                                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                                                !isUnlocked && "opacity-50 cursor-not-allowed bg-muted hover:border-border"
                                            )}
                                        >

                                            <div className={cn("w-4 h-4 rounded-full border-[2px]", frame.cssClass)} />
                                            <span className={cn("text-xs font-semibold", frame.color)}>{frame.name}</span>
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px] rounded-lg">
                                                    <div className="text-[10px] font-bold flex items-center gap-1 bg-background border px-2 py-0.5 rounded-full shadow-sm">
                                                        <Lock className="w-3 h-3" /> Lvl {frame.minLevel}
                                                    </div>
                                                </div>
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
                    </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                    <Label>Kullanıcı Adı</Label>
                    <div className="relative">
                        <Input
                            value={displayName}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            className={cn(
                                "pr-10",
                                usernameError && "border-red-500 focus-visible:ring-red-500",
                                usernameSuccess && "border-green-500 focus-visible:ring-green-500"
                            )}
                        />
                        {checkLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                        {usernameError && <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />}
                    </div>

                    {suggestions.length > 0 && (
                        <div className="flex gap-2 text-xs mt-1">
                            <span className="text-muted-foreground">Öneriler:</span>
                            {suggestions.map(s => (
                                <span key={s} onClick={() => handleUsernameChange(s)} className="cursor-pointer text-primary hover:underline">{s}</span>
                            ))}
                        </div>
                    )}
                    {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
                    <p className="text-xs text-muted-foreground">Toplulukta görünecek adınız.</p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={loading} className="min-w-[150px]">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Değişiklikleri Kaydet
                    </Button>
                </div>
            </form>
        </div>
    );
}
