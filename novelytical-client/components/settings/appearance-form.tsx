"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppearanceForm() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Görünüm Ayarları</h3>
                <p className="text-sm text-muted-foreground">Uygulamanın temasını ve görünüm tercihlerini değiştirin.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md">
                <Button
                    variant="outline"
                    className={cn("h-24 flex flex-col gap-2 transition-all hover:bg-primary/5 hover:border-primary/50", theme === 'light' && "border-2 border-primary bg-primary/10")}
                    onClick={() => setTheme("light")}
                >
                    <Sun className="h-6 w-6" />
                    <span className="font-medium">Aydınlık</span>
                </Button>
                <Button
                    variant="outline"
                    className={cn("h-24 flex flex-col gap-2 transition-all hover:bg-primary/5 hover:border-primary/50", theme === 'dark' && "border-2 border-primary bg-primary/10")}
                    onClick={() => setTheme("dark")}
                >
                    <Moon className="h-6 w-6" />
                    <span className="font-medium">Karanlık</span>
                </Button>
                <Button
                    variant="outline"
                    className={cn("h-24 flex flex-col gap-2 transition-all hover:bg-primary/5 hover:border-primary/50", theme === 'system' && "border-2 border-primary bg-primary/10")}
                    onClick={() => setTheme("system")}
                >
                    <Monitor className="h-6 w-6" />
                    <span className="font-medium">Sistem</span>
                </Button>
            </div>
        </div>
    );
}
