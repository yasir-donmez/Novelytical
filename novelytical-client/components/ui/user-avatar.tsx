import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LEVEL_FRAMES } from "@/services/level-service";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    alt?: string;
    frameId?: string | null;
    className?: string;
    fallbackClass?: string;
    size?: "sm" | "md" | "lg" | "xl";
    children?: React.ReactNode;
}

export function UserAvatar({
    src,
    alt,
    frameId,
    className,
    fallbackClass,
    size = "md",
    children
}: UserAvatarProps) {
    const frame = LEVEL_FRAMES.find(f => f.id === frameId);

    // Default size classes if not overridden by className
    // This allows easy sizing but className always wins
    const sizeClasses = {
        sm: "h-6 w-6",  // 24px
        md: "h-8 w-8",  // 32px
        lg: "h-10 w-10", // 40px
        xl: "h-14 w-14"  // 56px
    };

    // Calculate frame offset based on the specific frame style if needed, 
    // but typically our CSS classes handle the border/padding.
    // However, some frames might need the image to be slightly inset.

    return (
        <div className={cn("relative shrink-0 rounded-full", className || sizeClasses[size])}>
            {/* Frame Container */}
            {/* Frame Container */}
            <div className={cn(
                "absolute -inset-1 rounded-full pointer-events-none z-0",
                frame?.cssClass
            )} />

            {/* Avatar */}
            <Avatar className="h-full w-full relative z-10">
                <AvatarImage src={src || undefined} alt={alt || "Avatar"} className="object-cover" />
                <AvatarFallback className={cn("text-[10px]", fallbackClass)}>
                    {alt ? alt.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
            </Avatar>
            {children}
        </div>
    );
}
