import "../styles/FocalPointPicker.css";

export default function FocalPointPicker({ imageUrl, x, y, onChange }) {
    if (!imageUrl) return null;

    const focalX = x ?? 50;
    const focalY = y ?? 50;

    const setFocusFromPointer = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const nextX = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
        const nextY = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
        onChange(Math.round(nextX), Math.round(nextY));
    };

    return (
        <div className="focal-point-picker">
            <div className="focal-point-picker-heading">
                <div>
                    <strong>Display Focus</strong>
                    <p>Click the preview or use the sliders to choose which part stays visible.</p>
                </div>
                <span>{Math.round(focalX)}% X, {Math.round(focalY)}% Y</span>
            </div>

            <div className="focal-point-picker-body">
                <button
                    type="button"
                    className="focal-point-preview"
                    onClick={setFocusFromPointer}
                    aria-label="Choose the image display focus"
                >
                    <img
                        src={imageUrl}
                        alt="Display focus preview"
                        style={{ objectPosition: `${focalX}% ${focalY}%` }}
                    />
                    <span
                        className="focal-point-marker"
                        style={{ left: `${focalX}%`, top: `${focalY}%` }}
                        aria-hidden="true"
                    />
                    <span className="focal-point-preview-hint">Click to reposition</span>
                </button>

                <div className="focal-point-sliders">
                    <label>
                        <span>Horizontal <b>{Math.round(focalX)}%</b></span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={focalX}
                            onChange={(e) => onChange(Number(e.target.value), focalY)}
                        />
                    </label>

                    <label>
                        <span>Vertical <b>{Math.round(focalY)}%</b></span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={focalY}
                            onChange={(e) => onChange(focalX, Number(e.target.value))}
                        />
                    </label>

                    <div className="focal-point-presets">
                        <button type="button" className="focal-point-reset" onClick={() => onChange(50, 25)}>
                            Focus Top
                        </button>
                        <button type="button" className="focal-point-reset" onClick={() => onChange(50, 50)}>
                            Focus Center
                        </button>

                        <button type="button" className="focal-point-reset" onClick={() => onChange(50, 80)}>
                            Focus Lower
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
