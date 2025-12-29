import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovelListDto } from '@/types/novel';

interface NovelCardProps {
    novel: NovelListDto;
    onClick?: () => void;
}

export function NovelCard({ novel, onClick }: NovelCardProps) {
    return (
        <>
            {/* Mobile/Tablet: Horizontal Layout */}
            <Card
                onClick={onClick}
                className="group lg:hidden overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-row rounded-xl p-1.5"
            >
                {/* Cover - Left Side */}
                <div className="w-28 aspect-[3/4] flex-shrink-0 overflow-hidden rounded-xl flex items-center justify-center relative">
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
                <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-sm line-clamp-2">{novel.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{novel.author}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{novel.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{novel.chapterCount} Bölüm</span>
                    </div>
                </div>
            </Card>

            {/* Desktop: Vertical Layout */}
            <Card
                onClick={onClick}
                className="group hidden lg:block overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
                <CardHeader className="p-3">
                    <div className="aspect-[3/4] overflow-hidden rounded-xl flex items-center justify-center relative">
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
                                <span className="text-6xl">📚</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{novel.title}</h3>
                    <p className="text-sm text-muted-foreground">{novel.author}</p>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{novel.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{novel.chapterCount} Bölüm</span>
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex-wrap gap-2">
                    {novel.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </CardFooter>
            </Card>
        </>
    );
}
