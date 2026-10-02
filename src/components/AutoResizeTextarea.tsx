import { useLayoutEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
    if (!textarea) return;

    textarea.style.setProperty("height", "auto", "important");
    textarea.style.setProperty("max-height", "none", "important");
    textarea.style.setProperty("overflow-y", "hidden", "important");
    textarea.style.setProperty("height", `${textarea.scrollHeight}px`, "important");
}

export default function AutoResizeTextarea({ value, onInput, style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        resizeTextarea(textareaRef.current);
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onInput={(event) => {
                resizeTextarea(event.currentTarget);
                onInput?.(event);
            }}
            style={style}
            {...props}
        />
    );
}
