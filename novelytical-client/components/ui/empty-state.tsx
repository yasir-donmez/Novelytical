import { Button } from "@/components/ui/button"
import { SearchX, FileQuestion, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    title?: string
    description?: string
    icon?: "search" | "data" | "default"
    actionLabel?: string
    onAction?: () => void
    href?: string
    className?: string
}

export function EmptyState({
    title = "Sonuç bulunamadı",
    description = "Aradığınız kriterlere uygun kayıt bulamadık.",
    icon = "default",
    actionLabel,
    onAction,
    href,
    className
}: EmptyStateProps) {

    const IconComponent = {
        search: SearchX,
        data: FileQuestion,
        default: SearchX
    }[icon]

    return (
        <div className={cn("flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500", className)}>
            <div className="bg-muted/30 p-4 rounded-full mb-4 ring-1 ring-border">
                <IconComponent className="h-10 w-10 text-muted-foreground/50" />
            </div>

            <h3 className="text-xl font-semibold tracking-tight mb-2">
                {title}
            </h3>

            <p className="text-muted-foreground text-sm max-w-sm mb-6 text-balance">
                {description}
            </p>

            {actionLabel && (
                <Button
                    variant="outline"
                    onClick={onAction}
                    className="gap-2 group"
                    asChild={!!href}
                >
                    {href ? (
                        <a href={href}>
                            {icon === 'search' ? <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" /> : null}
                            {actionLabel}
                        </a>
                    ) : (
                        <>
                            {icon === 'search' ? <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" /> : null}
                            {actionLabel}
                        </>
                    )}
                </Button>
            )}
        </div>
    )
}
