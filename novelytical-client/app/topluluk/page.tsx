import { CommunityPulseOptimized } from '@/components/community-section/community-pulse-optimized';
import { MessageSquare } from 'lucide-react';

export default function CommunityPage() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-24">
            <div className="flex items-center gap-4 select-none mb-8">
                <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                    <MessageSquare className="h-6 w-6 text-green-500 fill-green-500/20" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">Topluluk</h1>
                    <p className="text-sm text-muted-foreground">Diğer okurlarla sohbet et ve tartış</p>
                </div>
            </div>
            <CommunityPulseOptimized />
        </div>
    );
}
