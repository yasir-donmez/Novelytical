'use client';

import { useEffect, useState } from 'react';
import { getReviewsByNovelId } from '@/services/review-service';

interface RatingCriteriaTooltipProps {
    criteria: CriteriaData | null;
    loading: boolean;
}

interface CriteriaData {
    story: number;
    characters: number;
    world: number;
    flow: number;
    grammar: number;
}

export function RatingCriteriaTooltip({ criteria, loading }: RatingCriteriaTooltipProps) {
    if (loading) {
        return (
            <div className="space-y-1 text-xs min-w-[140px]">
                <div className="text-zinc-400">Yükleniyor...</div>
            </div>
        );
    }

    if (!criteria) {
        return (
            <div className="space-y-1 text-xs min-w-[140px]">
                <div className="text-zinc-400">Henüz değerlendirme yok</div>
            </div>
        );
    }

    return (
        <div className="space-y-1 text-xs min-w-[140px]">
            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                <span className="text-zinc-400">Kriterler</span>
                <span className="font-semibold text-zinc-100">Puan</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-zinc-300">Kurgu:</span>
                <b className="text-purple-400 ml-2">{criteria.story.toFixed(1)}</b>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-zinc-300">Karakterler:</span>
                <b className="text-purple-400 ml-2">{criteria.characters.toFixed(1)}</b>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-zinc-300">Dünya:</span>
                <b className="text-purple-400 ml-2">{criteria.world.toFixed(1)}</b>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-zinc-300">Akıcılık:</span>
                <b className="text-purple-400 ml-2">{criteria.flow.toFixed(1)}</b>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-zinc-300">Dilbilgisi:</span>
                <b className="text-purple-400 ml-2">{criteria.grammar.toFixed(1)}</b>
            </div>
        </div>
    );
}
