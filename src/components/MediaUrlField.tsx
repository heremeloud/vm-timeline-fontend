import { useState } from "react";
import type { ChangeEventHandler, ClipboardEventHandler } from "react";

const filenameFromUrl = (value: string) => {
    try {
        return decodeURIComponent(new URL(value).pathname.split("/").pop() || value);
    } catch {
        return value;
    }
};

interface MediaUrlFieldProps {
    value: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onPaste?: ClipboardEventHandler<HTMLInputElement>;
    placeholder?: string;
}

export default function MediaUrlField({ value, onChange, onPaste, placeholder }: MediaUrlFieldProps) {
    const [editing, setEditing] = useState(false);

    if (value.trim() && !editing) {
        return (
            <div className="media-url-compact" title={value}>
                <span>{filenameFromUrl(value)}</span>
                <button type="button" onClick={() => setEditing(true)}>Edit URL</button>
            </div>
        );
    }

    return (
        <input
            autoFocus={editing}
            value={value}
            onChange={onChange}
            onPaste={onPaste}
            onBlur={() => {
                if (value.trim()) setEditing(false);
            }}
            placeholder={placeholder}
            style={{ flex: 1 }}
        />
    );
}
