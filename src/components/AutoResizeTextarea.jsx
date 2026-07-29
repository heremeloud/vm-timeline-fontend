import { useLayoutEffect, useRef } from "react";

function resizeTextarea(textarea) {
    if (!textarea) return;

    textarea.style.setProperty("height", "auto", "important");
    textarea.style.setProperty("max-height", "none", "important");
    textarea.style.setProperty("overflow-y", "hidden", "important");
    textarea.style.setProperty("height", `${textarea.scrollHeight}px`, "important");
}

export default function AutoResizeTextarea({ value, onInput, style, ...props }) {
    const textareaRef = useRef(null);

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
