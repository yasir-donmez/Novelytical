import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NovelCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-48 w-full rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </CardContent>
        </Card>
    );
}
