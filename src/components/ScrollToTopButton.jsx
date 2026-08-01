import { useEffect, useState } from "react";

export default function ScrollToTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const updateVisibility = () => setVisible(window.scrollY > 400);
        updateVisibility();
        window.addEventListener("scroll", updateVisibility, { passive: true });
        return () => window.removeEventListener("scroll", updateVisibility);
    }, []);

    if (!visible) return null;

    return (
        <button
            type="button"
            className="scroll-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Return to top"
            title="Return to top"
        >
            ↑
        </button>
    );
}
