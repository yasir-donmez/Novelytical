import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByNovelId } from '@/services/review-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const novelId = parseInt(id);

        if (isNaN(novelId)) {
            return NextResponse.json(
                { error: 'Invalid novel ID' },
                { status: 400 }
            );
        }

        const reviews = await getReviewsByNovelId(novelId);
        return NextResponse.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reviews' },
            { status: 500 }
        );
    }
}
