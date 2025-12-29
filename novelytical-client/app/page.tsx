'use client'

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { novelService } from '@/services/novelService';
import { useDebounce } from '@/hooks/useDebounce';
import { NovelCard } from '@/components/novel-card';
import { NovelCardSkeleton } from '@/components/novel-card-skeleton';
import { Search, X } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebounce(searchInput, 800);

  // Sayfa numarasını URL'den oku, varsayılan 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['novels', debouncedSearch, currentPage],
    queryFn: () => novelService.getNovels({
      searchString: debouncedSearch || undefined,
      pageNumber: currentPage,
      pageSize: 12
    }),
    // Only fetch if search is empty OR has at least 2 characters
    enabled: debouncedSearch === '' || debouncedSearch.length >= 2,
  });

  // Sayfa değiştiğinde yukarı scroll
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    // Arama değiştiğinde sayfa 1'e dön
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-background/50">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/30 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500/30 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container relative z-10 mx-auto px-8 sm:px-12 lg:px-16 xl:px-24 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-6">
              {/* Site Branding */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                  Novelytical
                </span>
              </h1>

              {/* Typewriter Subtitle */}
              <div className="h-16 flex items-center justify-center">
                <p className="typewriter text-xl md:text-2xl text-muted-foreground leading-relaxed inline-block">
                  Yapay zeka ile roman keşfet
                </p>
              </div>
            </div>

            {/* AI Premium Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              {/* Outer Glow Layer */}
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-purple-500/30 to-blue-500/30 rounded-full blur-xl opacity-0 group-focus-within:opacity-60 transition-all duration-500 animate-pulse"></div>

              {/* Search Container */}
              <div className="relative ai-search-input rounded-full">
                <div className="relative bg-background/95 backdrop-blur-md rounded-full border-2 border-input transition-all duration-300 focus-within:border-transparent focus-within:shadow-2xl">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />

                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Hangi hikayeyi arıyorsun? (Örn: Ejderha binicisi)"
                    className="w-full pl-16 pr-16 py-5 rounded-full bg-transparent text-lg font-medium focus:outline-none placeholder:text-muted-foreground/60 transition-all"
                  />

                  {searchInput && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all hover:scale-110"
                      aria-label="Aramayı temizle"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results count with animation */}
            {data && (
              <p className="text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
                <span className="text-lg font-bold text-primary">{data.totalRecords}</span>
                {' '}roman bulundu
                {debouncedSearch && (
                  <span className="inline-block ml-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    "{debouncedSearch}"
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Novel Grid */}
      <section className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 xl:px-24 py-8">
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive text-lg">
              Romanlar yüklenirken bir hata oluştu. Backend çalışıyor mu?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {(error as Error).message}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <NovelCardSkeleton key={i} />
            ))}
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Aradığınız kriterlere uygun roman bulunamadı.
            </p>
            {debouncedSearch && (
              <button
                onClick={() => handleSearch('')}
                className="mt-4 text-primary hover:underline"
              >
                Tüm romanları göster
              </button>
            )}
          </div>
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.data.map((novel) => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onClick={() => router.push(`/novel/${novel.id}`)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {data.totalPages > 1 && (
              <div className="mt-12 space-y-4">
                {/* Sayfa Bilgisi */}
                <div className="text-center text-sm text-muted-foreground">
                  {((currentPage - 1) * data.pageSize) + 1}-
                  {Math.min(currentPage * data.pageSize, data.totalRecords)} arası gösteriliyor
                  {' / '}Toplam {data.totalRecords} roman
                </div>

                {/* Pagination Buttons */}
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>

                    {/* Sayfa Numaraları */}
                    {renderPageNumbers(currentPage, data.totalPages, handlePageChange)}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < data.totalPages) handlePageChange(currentPage + 1);
                        }}
                        className={currentPage === data.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container mx-auto py-24 text-center">Yükleniyor...</div>}>
      <HomeContent />
    </Suspense>
  );
}

// Helper function: Sayfa numaralarını render et
function renderPageNumbers(currentPage: number, totalPages: number, onPageChange: (page: number) => void) {
  const pages: React.JSX.Element[] = [];
  const maxVisible = 5; // Maksimum görünür sayfa numarası

  if (totalPages <= maxVisible) {
    // Tüm sayfaları göster
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
  } else {
    // Akıllı sayfa numarası gösterimi
    // Her zaman ilk sayfayı göster
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(1);
          }}
          isActive={currentPage === 1}
          className="cursor-pointer"
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Başta ellipsis göster
    if (currentPage > 3) {
      pages.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Ortadaki sayfalar
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Sonda ellipsis göster
    if (currentPage < totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Her zaman son sayfayı göster
    pages.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(totalPages);
          }}
          isActive={currentPage === totalPages}
          className="cursor-pointer"
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    );
  }

  return pages;
}
