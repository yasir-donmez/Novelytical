'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from '@/components/ui/pagination';
import { useEffect, useRef, useTransition } from 'react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    pageSize: number;
    totalRecords: number;
}

export function PaginationClient({ totalPages, currentPage, pageSize, totalRecords }: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isFirstRender = useRef(true);
    const [isPending, startTransition] = useTransition();

    // Scroll to top on page change, but skip initial render (browser handles restoration)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const handlePageChange = (page: number) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (page === 1) {
                params.delete('page');
            } else {
                params.set('page', page.toString());
            }
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    if (totalPages <= 1) return null;

    return (
        <div className="mt-12 space-y-4">
            {/* Sayfa Bilgisi */}
            <div className="text-center text-sm text-muted-foreground">
                {((currentPage - 1) * pageSize) + 1}-
                {Math.min(currentPage * pageSize, totalRecords)} arası gösteriliyor
                {' / '}Toplam {totalRecords} roman
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
                    {renderPageNumbers(currentPage, totalPages, handlePageChange)}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) handlePageChange(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
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
