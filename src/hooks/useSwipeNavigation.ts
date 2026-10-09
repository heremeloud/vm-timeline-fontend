import { useRef } from "react";
import type { TouchEventHandler } from "react";
import { useNavigate } from "react-router-dom";

/** Horizontal touch navigation that leaves predominantly vertical scrolling alone. */
export default function useSwipeNavigation(previousUrl?: string | null, nextUrl?: string | null) {
    const navigate = useNavigate();
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
        if (event.touches.length !== 1) {
            touchStart.current = null;
            return;
        }
        touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || event.changedTouches.length !== 1) return;

        const deltaX = event.changedTouches[0].clientX - start.x;
        const deltaY = event.changedTouches[0].clientY - start.y;
        if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

        const target = deltaX < 0 ? nextUrl : previousUrl;
        if (target) navigate(target);
    };

    return { onTouchStart, onTouchEnd };
}
