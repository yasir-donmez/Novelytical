import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovelListDto } from '@/types/novel';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Bookmark, Star, MessageCircle } from 'lucide-react';
import { getRelativeTimeString } from '@/lib/utils/date';

interface NovelCardProps {
    novel: NovelListDto;
    variant?: 'default' | 'vertical' | 'horizontal';
    aspect?: 'portrait' | 'square' | 'landscape' | 'auto'; // Added for compatibility with Discovery Page
    className?: string;
}

export function NovelCard({ novel, variant = 'default', aspect, className }: NovelCardProps) {
    // If aspect is provided, it overrides variant logic for simple aspect control
    // taking 'portrait' as default vertical look
    const computedVariant = aspect ? 'vertical' : variant;

    // Logic to determine visibility classes
    const mobileLayoutClass = computedVariant === 'vertical'
        ? 'hidden' // Never show mobile layout if forced vertical
        : computedVariant === 'horizontal'
            ? 'flex' // Always show if forced horizontal
            : 'flex md:hidden'; // Default: Show on mobile, hide on desktop

    const verticalLayoutClass = computedVariant === 'horizontal'
        ? 'hidden' // Never show vertical if forced horizontal
        : computedVariant === 'vertical'
            ? 'block' // Always show if forced vertical
            : 'hidden md:block'; // Default: Hide on mobile, show on desktop

    return (
        <>
            {/* Mobile: Horizontal Layout */}
            <Link
                href={`/novel/${novel.id}`}
                className={cn(
                    "group overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 hover:shadow-lg transition-shadow cursor-pointer flex-row rounded-xl p-1.5 flex", // Ensure flex is applied for Link anchor
                    mobileLayoutClass,
                    className
                )}
            >
                {/* Card Content replaced div with Link wrapper essentially or wrapping Card content directly */}
                {/* Note: Card component might render a div. Putting Link around it is standard. */}
                {/* But here we want the whole card to be clickable. */}
                {/* Ideally we replace Card with Link and add card classes to Link */}
                {/* Let's verify what Card renders. usually a div with classes. */}
                {/* So I will remove <Card> wrapper and use <Link> with the same classes + 'flex' for layout */}

                {/* Actually, keeping structure simple: Link -> div(Card content) */}
                {/* But Card component from shadcn is just a styled div. */}

                {/* Cover - Left Side */}
                <div className="w-24 aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg flex items-center justify-center relative">
                    {novel.coverUrl ? (
                        <>
                            <img
                                src={novel.coverUrl}
                                alt={novel.title}
                                className="object-cover w-full h-full"
                            />
                            {/* Shine Effect */}
                            <div className="absolute top-0 left-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/4 h-[300%] shine-effect pointer-events-none" />
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <span className="text-4xl">📚</span>
                        </div>
                    )}
                </div>

                {/* Content - Right Side */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div className="space-y-1.5">
                        <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{novel.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{novel.author}</p>
                    </div>

                    <div className="mt-auto space-y-2">
                        <div className="flex items-center gap-3 text-xs">
                            <Badge variant="secondary" className="h-5 px-1.5 font-normal bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20">
                                ★ {(novel.scrapedRating ?? novel.rating).toFixed(1)}
                            </Badge>
                            <span className="text-muted-foreground">{novel.chapterCount} Bölüm</span>
                        </div>
                        {/* Mobile Tags */}
                        <div className="flex gap-1 overflow-hidden items-center">
                            {novel.tags && novel.tags.length > 0 ? (
                                novel.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-border/50 bg-background/50">
                                        {tag}
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground/50 border-border/30 bg-background/30 italic">
                                    Etiket Yok
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Tablet/Desktop: Vertical Layout */}
            <div className={cn("relative group w-full h-full", aspect === 'auto' ? "block" : "flex-grow flex flex-col", verticalLayoutClass, className)}>
                {/* Ambient Glow Effect - specific for vertical layout but conflicting with transparent cards in Bento */}
                {novel.coverUrl && aspect !== 'auto' && (
                    <div
                        className="absolute -inset-3 rounded-[2rem] bg-cover bg-center blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundImage: `url(${novel.coverUrl})` }}
                    />
                )}

                <Link
                    href={`/novel/${novel.id}`}
                    className={cn(
                        "relative z-10 overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer hover:border-primary/20",
                        aspect === 'auto' ? "block w-full h-full rounded-xl p-3" : "flex-grow flex flex-col h-full rounded-xl"
                    )}
                >
                    {aspect === 'auto' ? (
                        <div className="h-full w-full">
                            <div className={cn(
                                "overflow-hidden flex items-center justify-center relative shadow-sm h-full w-full rounded-lg"
                            )}>
                                {novel.coverUrl ? (
                                    <>
                                        <img
                                            src={novel.coverUrl}
                                            alt={novel.title}
                                            className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-110 block"
                                        />
                                        {/* Last Updated Badge - Top Left */}
                                        <div className="absolute top-2 left-2 z-30">
                                            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs font-medium shadow-lg border border-white/10">
                                                <span>{novel.lastUpdated ? getRelativeTimeString(novel.lastUpdated) : '-'}</span>
                                            </div>
                                        </div>
                                        {/* Hover Stats Overlay */}
                                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-30">
                                            {/* Rating */}
                                            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg text-white text-xs font-medium shadow-sm">
                                                <span>{(novel.scrapedRating ?? novel.rating).toFixed(1)}</span>
                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            </div>
                                        </div>
                                        {/* Shine Effect */}
                                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent pointer-events-none z-20" />

                                        {/* Alternative Simple Swipe Effect */}
                                        <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-[shine_1s_ease-in-out] pointer-events-none z-20" />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <span className="text-6xl">📚</span>
                                    </div>
                                )}

                                {/* Bottom Overlay for aspect="auto" (Bento/Discovery) */}
                                <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white z-20 flex flex-col justify-end gap-0">
                                    <h3 className="font-semibold text-sm md:text-base line-clamp-1 leading-tight text-shadow-sm">{novel.title}</h3>
                                    <p className="text-xs text-white/80 line-clamp-1">{novel.author}</p>

                                    {/* Inline Tags */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {novel.tags && novel.tags.slice(0, 2).map((tag) => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-sm border border-white/10 text-white font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3">
                            <div className={cn(
                                "overflow-hidden flex items-center justify-center relative shadow-sm",
                                aspect === 'square' ? "aspect-square rounded-xl" : "aspect-[2/3] rounded-xl"
                            )}>
                                {novel.coverUrl ? (
                                    <>
                                        <img
                                            src={novel.coverUrl}
                                            alt={novel.title}
                                            className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-110 block"
                                        />
                                        {/* Hover Stats Overlay */}
                                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-30">
                                            {/* Rating */}
                                            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg text-white text-xs font-medium shadow-sm">
                                                <span>{(novel.scrapedRating ?? novel.rating).toFixed(1)}</span>
                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            </div>
                                        </div>
                                        {/* Shine Effect */}
                                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent pointer-events-none z-20" />

                                        {/* Alternative Simple Swipe Effect */}
                                        <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-[shine_1s_ease-in-out] pointer-events-none z-20" />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <span className="text-6xl">📚</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <CardContent className={cn("px-4 pb-2 pt-3 flex-grow", aspect === 'auto' && "hidden")}>

                        <h3 className={cn("font-semibold text-base md:text-lg line-clamp-2 leading-7 min-h-[3.5rem] mb-2", aspect === 'auto' && "hidden")}>{novel.title}</h3>
                        <p className="text-sm text-muted-foreground truncate h-5 flex items-center mb-2">{novel.author}</p>
                        <div className="flex items-center gap-2 text-sm h-5">
                            <span className="text-yellow-500">★</span>
                            <span className="font-medium">{(novel.scrapedRating ?? novel.rating).toFixed(1)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{novel.chapterCount} Bölüm</span>
                        </div>
                    </CardContent>
                    <CardFooter className={cn("p-4 pt-0 flex-wrap gap-2 mt-auto", aspect === 'auto' && "hidden")}>
                        {novel.tags && novel.tags.length > 0 ? (
                            novel.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs h-5 px-2 flex items-center justify-center">
                                    {tag}
                                </Badge>
                            ))
                        ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground/50 border-border/30 italic">
                                Etiket Yok
                            </Badge>
                        )}
                    </CardFooter>
                </Link>
            </div >
        </>
    );
}
