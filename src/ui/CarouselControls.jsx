import "../styles/MediaCarousel.css";

export default function CarouselControls({
    index,
    total,
    onChange,
    itemLabel = "Slide",
}) {
    if (total <= 1) return null;

    return (
        <>
            {index > 0 && (
                <button
                    type="button"
                    className="media-carousel-arrow media-carousel-arrow--left"
                    aria-label={`Previous ${itemLabel.toLowerCase()}`}
                    onClick={() => onChange(index - 1)}
                >
                    ‹
                </button>
            )}
            {index < total - 1 && (
                <button
                    type="button"
                    className="media-carousel-arrow media-carousel-arrow--right"
                    aria-label={`Next ${itemLabel.toLowerCase()}`}
                    onClick={() => onChange(index + 1)}
                >
                    ›
                </button>
            )}
            <div className="media-carousel-dots" aria-label={`${itemLabel} navigation`}>
                {Array.from({ length: total }, (_, slideIndex) => (
                    <button
                        type="button"
                        key={slideIndex}
                        className={`media-carousel-dot${slideIndex === index ? " active" : ""}`}
                        aria-label={`${itemLabel} ${slideIndex + 1}`}
                        aria-current={slideIndex === index ? "true" : undefined}
                        onClick={() => onChange(slideIndex)}
                    />
                ))}
            </div>
        </>
    );
}
