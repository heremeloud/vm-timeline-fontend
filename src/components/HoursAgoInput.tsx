import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, TextInput } from "../ui";
import { localClockToBangkokDateTime, timeAgoToBangkokDateTime } from "../utils/postUrls";

interface HoursAgoInputProps {
    /** Called with the Bangkok date (YYYY-MM-DD) and time (HH:MM:SS) that is the typed hours and minutes before now. */
    onApply: (date: string, time: string) => void;
    /** For content that only stores a date (Instagram stories and reels): the button sets the date alone. */
    dateOnly?: boolean;
    /** A time already saved for this content (Bangkok HH:MM:SS), shown so it is clear what is stored. */
    savedTime?: string | null;
}

export default function HoursAgoInput({ onApply, dateOnly = false, savedTime = null }: HoursAgoInputProps) {
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [localClock, setLocalClock] = useState("");
    const result = timeAgoToBangkokDateTime(hours, minutes);
    const clockResult = localClockToBangkokDateTime(localClock);
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const apply = () => {
        if (result) onApply(result.date, result.time);
    };

    // A clock time in the viewer's own zone: fill the hours/minutes boxes with how long ago it was, and set the date and time.
    const applyLocalClock = () => {
        if (!clockResult) return;
        setHours(String(clockResult.hours));
        setMinutes(String(clockResult.minutes));
        onApply(clockResult.date, clockResult.time);
    };

    const handleClockKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        applyLocalClock();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") return;
        event.preventDefault(); // don't submit the surrounding form
        apply();
    };

    // One grid so both rows line up: [hours box][label][minutes box][label][button]; the time box spans the first three columns.
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
            <Button size="small" disabled={!result} onClick={apply}>Set date &amp; time</Button>

            <TextInput
                className="eventform-hours-ago-clock"
                type="time"
                value={localClock}
                onChange={(e) => setLocalClock(e.target.value)}
                onKeyDown={handleClockKeyDown}
                aria-label={`Time in your local zone (${localZone})`}
                title={`Your local time (${localZone})`}
            />
            <span>or at your local time</span>
            <Button size="small" disabled={!clockResult} onClick={applyLocalClock}>Use local time</Button>

            {dateOnly && (
                <span className="eventform-field-note">
                    Saved as this story's time (shown to admins). Stories with a time are ordered by it.
                    {savedTime && ` Current: ${savedTime}`}
                </span>
            )}
        </div>
    );
}
