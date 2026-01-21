'use client';

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SlidersHorizontal, BookOpen, Star, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface AdvancedFiltersModalProps {
    minChapters: number | null;
    maxChapters: number | null;
    minRating: number | null;
    maxRating: number | null;
    onApply: (filters: {
        minChapters: number | null,
        maxChapters: number | null,
        minRating: number | null,
        maxRating: number | null
    }) => void;
}

// Preset chapter ranges
const CHAPTER_RANGES = [
    { label: "0-100", min: 0, max: 100 },
    { label: "100-300", min: 100, max: 300 },
    { label: "300-500", min: 300, max: 500 },
    { label: "500-1000", min: 500, max: 1000 },
    { label: "1000+", min: 1000, max: null },
];

// Preset rating ranges
const RATING_RANGES = [
    { label: "4.5+", min: 4.5, max: null },
    { label: "4.0+", min: 4.0, max: null },
    { label: "3.5+", min: 3.5, max: null },
    { label: "3.0+", min: 3.0, max: null },
    { label: "2.0-3.0", min: 2.0, max: 3.0 },
];

export function AdvancedFiltersModal({
    minChapters,
    maxChapters,
    minRating,
    maxRating,
    onApply
}: AdvancedFiltersModalProps) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // Internal state
    const [internalMinChapters, setInternalMinChapters] = useState<number | null>(minChapters);
    const [internalMaxChapters, setInternalMaxChapters] = useState<number | null>(maxChapters);
    const [internalMinRating, setInternalMinRating] = useState<number | null>(minRating);
    const [internalMaxRating, setInternalMaxRating] = useState<number | null>(maxRating);

    // Sync with props when modal opens
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setInternalMinChapters(minChapters);
            setInternalMaxChapters(maxChapters);
            setInternalMinRating(minRating);
            setInternalMaxRating(maxRating);
        }
        setOpen(isOpen);
    };

    const handleApply = () => {
        onApply({
            minChapters: internalMinChapters,
            maxChapters: internalMaxChapters,
            minRating: internalMinRating,
            maxRating: internalMaxRating
        });
        setOpen(false);
    };

    const handleClear = () => {
        setInternalMinChapters(null);
        setInternalMaxChapters(null);
        setInternalMinRating(null);
        setInternalMaxRating(null);
    };

    const hasActiveFilters = minChapters !== null || maxChapters !== null || minRating !== null || maxRating !== null;

    // Shared Content
    const renderFiltersContent = (className?: string) => (
        <div className={cn("space-y-6", className)}>
            {/* Chapter Count Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">Bölüm Sayısı</Label>
                </div>

                {/* Preset Ranges */}
                <div className="flex flex-wrap gap-2">
                    {CHAPTER_RANGES.map((range) => {
                        const isActive = internalMinChapters === range.min && internalMaxChapters === range.max;
                        return (
                            <Button
                                key={range.label}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (isActive) {
                                        // Deselect if already active
                                        setInternalMinChapters(null);
                                        setInternalMaxChapters(null);
                                    } else {
                                        setInternalMinChapters(range.min);
                                        setInternalMaxChapters(range.max);
                                    }
                                }}
                                className={cn(
                                    "text-xs",
                                    isActive && "shadow-lg shadow-primary/25 ring-2 ring-primary ring-offset-1"
                                )}
                            >
                                {range.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Manual Inputs */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={internalMinChapters ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInternalMinChapters(val === '' ? null : Number(val));
                            }}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                            type="number"
                            placeholder="∞"
                            value={internalMaxChapters ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInternalMaxChapters(val === '' ? null : Number(val));
                            }}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary fill-primary" />
                    <Label className="text-base font-semibold">Yıldız (Rating)</Label>
                </div>

                {/* Preset Ranges */}
                <div className="flex flex-wrap gap-2">
                    {RATING_RANGES.map((range) => {
                        const isActive = internalMinRating === range.min && internalMaxRating === range.max;
                        return (
                            <Button
                                key={range.label}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (isActive) {
                                        // Deselect if already active
                                        setInternalMinRating(null);
                                        setInternalMaxRating(null);
                                    } else {
                                        setInternalMinRating(range.min);
                                        setInternalMaxRating(range.max);
                                    }
                                }}
                                className={cn(
                                    "text-xs",
                                    isActive && "shadow-lg shadow-primary/25 ring-2 ring-primary ring-offset-1"
                                )}
                            >
                                {range.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Manual Inputs */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                            type="number"
                            placeholder="0.0"
                            step="0.1"
                            value={internalMinRating ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInternalMinRating(val === '' ? null : Number(val));
                            }}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                            type="number"
                            placeholder="5.0"
                            step="0.1"
                            value={internalMaxRating ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInternalMaxRating(val === '' ? null : Number(val));
                            }}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const triggerButton = (
        <Button
            variant="outline"
            className={cn(
                "h-auto py-2 px-3 gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 hover:bg-primary/5",
                hasActiveFilters && "border-primary bg-primary/10"
            )}
        >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {hasActiveFilters ? (
                <span className="font-semibold text-primary">Gelişmiş Filtre</span>
            ) : (
                "Gelişmiş Filtre"
            )}
        </Button>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {triggerButton}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <SlidersHorizontal className="h-5 w-5 text-primary" />
                            Gelişmiş Filtreler
                        </DialogTitle>
                        <DialogDescription>
                            Bölüm sayısı ve yıldıza göre romanları filtreleyin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {renderFiltersContent()}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            variant="ghost"
                            onClick={handleClear}
                            className="flex-1 gap-2"
                        >
                            <X className="h-4 w-4" />
                            Temizle
                        </Button>
                        <Button onClick={handleApply} className="flex-1">
                            Uygula
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Drawer
    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerTrigger asChild>
                {triggerButton}
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="text-left">
                    <DrawerTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Gelişmiş Filtreler
                    </DrawerTitle>
                    <DrawerDescription>
                        Bölüm sayısı ve yıldıza göre romanları filtreleyin.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="p-4 overflow-y-auto">
                    {renderFiltersContent()}
                </div>

                <DrawerFooter className="pt-2 border-t">
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={handleClear}
                            className="flex-1 gap-2"
                        >
                            <X className="h-4 w-4" />
                            Temizle
                        </Button>
                        <Button onClick={handleApply} className="flex-[2]">
                            Uygula
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
