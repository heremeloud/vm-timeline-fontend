import "../styles/FocalPointPicker.css";

export default function FocalPointPicker({ imageUrl, x, y, onChange }) {
    if (!imageUrl) return null;

    const focalX = x ?? 50;
    const focalY = y ?? 50;

    return (
        <div className="focal-point-picker">
            <div className="focal-point-preview">
                <img
                    src={imageUrl}
                    alt=""
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                />
            </div>

            <div className="focal-point-sliders">
                <label>
                    Horizontal focus: {Math.round(focalX)}%
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={focalX}
                        onChange={(e) => onChange(Number(e.target.value), focalY)}
                    />
                </label>

                <label>
                    Vertical focus: {Math.round(focalY)}%
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={focalY}
                        onChange={(e) => onChange(focalX, Number(e.target.value))}
                    />
                </label>

                <div className="focal-point-presets">
                    <button
                        type="button"
                        className="focal-point-reset"
                        onClick={() => onChange(50, 50)}
                    >
                        Reset to center
                    </button>

                    <button
                        type="button"
                        className="focal-point-reset"
                        onClick={() => onChange(focalX, 80)}
                    >
                        Focus lower (80%)
                    </button>
                </div>
            </div>
        </div>
    );
}
