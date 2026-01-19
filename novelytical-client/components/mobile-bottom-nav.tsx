"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, MessageSquare, Menu, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileBottomNavProps {
    onMenuClick?: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
    const pathname = usePathname()

    const navItems = [
        {
            href: "/",
            label: "Ana Sayfa",
            icon: Home
        },
        {
            href: "/romanlar",
            label: "Romanlar",
            icon: BookOpen
        },
        {
            href: "/#community", // Scroll to community section
            label: "Topluluk",
            icon: MessageSquare
        },
        {
            label: "Menü",
            icon: LayoutGrid,
            action: onMenuClick
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/40 pb-[env(safe-area-inset-bottom)] md:hidden">
            <nav className="flex items-center justify-around h-16 px-2">
                {navItems.map((item, index) => {
                    const isActive = item.href ? pathname === item.href : false
                    const Icon = item.icon

                    if (item.action) {
                        return (
                            <button
                                key={index}
                                onClick={item.action}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform",
                                    "text-muted-foreground hover:text-primary"
                                )}
                            >
                                <Icon className="h-6 w-6" strokeWidth={2} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        )
                    }

                    return (
                        <Link
                            key={index}
                            href={item.href!}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform",
                                isActive
                                    ? "text-primary font-semibold"
                                    : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-colors",
                                isActive && "bg-primary/10"
                            )}>
                                <Icon className={cn("h-5 w-5", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
