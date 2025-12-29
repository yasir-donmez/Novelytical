import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Novelytical - Roman Keşif Platformu';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 60,
                    background: 'linear-gradient(to bottom right, #111827, #000000)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    {/* Book Icon */}
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: 20 }}
                    >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <h1 style={{ fontSize: 80, fontWeight: 'bold', margin: 0 }}>Novelytical</h1>
                </div>
                <p style={{ fontSize: 30, color: '#9CA3AF', marginTop: 10 }}>
                    Roman Analiz ve Takip Sistemi
                </p>
                <div style={{ display: 'flex', marginTop: 40, gap: 20 }}>
                    <div style={{ padding: '10px 20px', background: '#374151', borderRadius: 10, fontSize: 24 }}>
                        📚 20+ Roman
                    </div>
                    <div style={{ padding: '10px 20px', background: '#374151', borderRadius: 10, fontSize: 24 }}>
                        🔍 Yapay Zeka Arama
                    </div>
                    <div style={{ padding: '10px 20px', background: '#374151', borderRadius: 10, fontSize: 24 }}>
                        🌍 Türkçe & İngilizce
                    </div>
                </div>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
