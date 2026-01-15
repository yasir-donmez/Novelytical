import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Yazarlar | Novelytical",
    description: "Novelytical'daki popüler yazarları keşfedin.",
};

async function getTopAuthors() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/novels?pageSize=100`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) return [];

        const data = await res.json();
        const novels = data.data || data || [];

        // Count novels per author
        const authorCounts: Record<string, { count: number; totalChapters: number }> = {};

        novels.forEach((novel: any) => {
            const author = novel.author || "Bilinmeyen";
            if (!authorCounts[author]) {
                authorCounts[author] = { count: 0, totalChapters: 0 };
            }
            authorCounts[author].count++;
            authorCounts[author].totalChapters += novel.chapterCount || 0;
        });

        // Sort by novel count
        return Object.entries(authorCounts)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50);
    } catch (error) {
        console.error("Failed to fetch authors:", error);
        return [];
    }
}

export default async function YazarlarPage() {
    const authors = await getTopAuthors();

    return (
        <main className="container px-4 py-12 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Yazarlar</h1>
                <p className="text-muted-foreground mb-8">
                    Platformdaki en popüler yazarları keşfedin.
                </p>

                {authors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Henüz yazar verisi yok.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {authors.map((author, index) => (
                            <div
                                key={author.name}
                                className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-medium truncate">{author.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {author.count} roman · {author.totalChapters.toLocaleString('tr-TR')} bölüm
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
