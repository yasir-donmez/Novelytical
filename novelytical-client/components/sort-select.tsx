import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ArrowUpDown } from "lucide-react";

interface SortSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sıralama" />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="rating_asc">En Yüksek Puan</SelectItem>
                <SelectItem value="rating_desc">En Düşük Puan</SelectItem>
                <SelectItem value="date_desc">En Yeni</SelectItem>
                <SelectItem value="chapters_desc">En Çok Bölüm</SelectItem>
            </SelectContent>
        </Select>
    )
}
