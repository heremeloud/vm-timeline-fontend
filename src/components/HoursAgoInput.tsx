import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, TextInput } from "../ui";
import { timeAgoToBangkokDateTime } from "../utils/postUrls";

interface HoursAgoInputProps {
    /** Called with the Bangkok date (YYYY-MM-DD) and time (HH:MM:SS) that is the typed hours and minutes before now. */
    onApply: (date: string, time: string) => void;
    /** For content that only stores a date (Instagram stories and reels): the button sets the date alone. */
    dateOnly?: boolean;
}

export default function HoursAgoInput({ onApply, dateOnly = false }: HoursAgoInputProps) {
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const result = timeAgoToBangkokDateTime(hours, minutes);

    const apply = () => {
        if (result) onApply(result.date, result.time);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") return;
        event.preventDefault(); // don't submit the surrounding form
        apply();
    };

    return (
        <div className="eventform-hours-ago">
            <TextInput
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Hours ago"
            />
            <span>hours</span>
            <TextInput
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Minutes ago"
            />
            <span>minutes ago</span>
            <Button size="small" disabled={!result} onClick={apply}>{dateOnly ? "Set date" : "Set date & time"}</Button>
        </div>
    );
}
