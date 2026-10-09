import { useEffect, useRef, useState } from "react";

export default function useNearViewport<T extends Element>(rootMargin = "600px") {
    const ref = useRef<T | null>(null);
    const [isNearViewport, setIsNearViewport] = useState(
        () => typeof IntersectionObserver === "undefined",
    );

    useEffect(() => {
        if (isNearViewport || !ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                setIsNearViewport(true);
                observer.disconnect();
            },
            { rootMargin },
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [isNearViewport, rootMargin]);

    return { ref, isNearViewport };
}
