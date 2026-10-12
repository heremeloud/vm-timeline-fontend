import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, TextInput } from "../ui";
import { hoursAgoToBangkokDateTime } from "../utils/postUrls";

interface HoursAgoInputProps {
    /** Called with the Bangkok date (YYYY-MM-DD) and time (HH:MM:SS) that is the given hours before now. */
    onApply: (date: string, time: string) => void;
}

export default function HoursAgoInput({ onApply }: HoursAgoInputProps) {
    const [hours, setHours] = useState("");
    const result = hoursAgoToBangkokDateTime(hours);

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
                placeholder="e.g. 5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Hours ago"
            />
            <span>hours ago</span>
            <Button size="small" disabled={!result} onClick={apply}>Set date &amp; time</Button>
        </div>
    );
}
