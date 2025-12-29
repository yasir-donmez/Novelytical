import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Novelytical - Roman Analiz ve Takip Sistemi',
  description: 'Türkçe ve İngilizce romanları keşfedin, arayın ve takip edin. Yapay zeka destekli anlamsal arama ile en sevdiğiniz kitapları bulun.',
  keywords: ['roman', 'kitap', 'arama', 'analiz', 'AI', 'yapay zeka', 'Türkçe', 'İngilizce', 'novel', 'book search'],
  authors: [{ name: 'Novelytical Team' }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: ['en_US'],
    url: 'https://novelytical.com',
    siteName: 'Novelytical',
    title: 'Novelytical - Roman Analiz ve Takip Sistemi',
    description: 'Türkçe ve İngilizce romanları keşfedin, arayın ve takip edin. Yapay zeka destekli anlamsal arama.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Novelytical - Roman Keşif Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Novelytical - Roman Analiz ve Takip Sistemi',
    description: 'Türkçe ve İngilizce romanları keşfedin, arayın ve takip edin.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="novelytical-theme"
          >
            {/* Header with Theme Toggle */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between px-8 sm:px-12 lg:px-16 xl:px-24">
                <a href="/" className="flex items-center gap-1 group">
                  <img
                    src="/logo.png"
                    alt="N"
                    width={40}
                    height={40}
                    className="transition-transform group-hover:scale-110 duration-300"
                  />
                  <span className="font-bold text-xl group-hover:text-primary transition-colors">
                    ovelytical
                  </span>
                </a>
                <ThemeToggle />
              </div>
            </header>
            {children}
            <Footer />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
