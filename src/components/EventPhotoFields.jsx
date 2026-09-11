import FocalPointPicker from "./FocalPointPicker";

export default function EventPhotoFields({ photos, onChange, dates = [], dateMode = "dates", startDate = "", endDate = "" }) {
    const dateOptions = [...new Set(dates.filter(Boolean))].sort();

    function updatePhoto(index, fields) {
        onChange(photos.map((photo, i) => i === index ? { ...photo, ...fields } : photo));
    }

    return (
        <div className="eventform-section">
            <label>Event Photos <span className="form-optional">(optional)</span></label>
            <p className="form-optional">Choose a date for each photo. The calendar uses the first photo assigned to that day, or the event’s first photo if none is assigned. Display Focus controls calendar thumbnails; list cards show full images.</p>
            {photos.map((photo, index) => (
                <div className="eventform-photo" key={index}>
                    <label htmlFor={`event-photo-${index}`}>Photo {index + 1} URL</label>
                    <div className="eventform-date-row">
                        <input id={`event-photo-${index}`} value={photo.url}
                            onChange={e => updatePhoto(index, { url: e.target.value })}
                            placeholder="https://..." />
                        <button type="button" aria-label={`Remove photo ${index + 1}`}
                            onClick={() => onChange(photos.filter((_, i) => i !== index))}>Remove</button>
                    </div>
                    <label htmlFor={`event-photo-date-${index}`}>Calendar date</label>
                    {dateMode === "dates" ? (
                        <select id={`event-photo-date-${index}`} value={photo.date || ""}
                            onChange={e => updatePhoto(index, { date: e.target.value || null })}>
                            <option value="">Unassigned (event default)</option>
                            {photo.date && !dateOptions.includes(photo.date) && (
                                <option value={photo.date}>{photo.date} — no longer an event date</option>
                            )}
                            {dateOptions.map(date => <option key={date} value={date}>{date}</option>)}
                        </select>
                    ) : (
                        <input id={`event-photo-date-${index}`} type="date" value={photo.date || ""}
                            min={startDate || undefined} max={endDate || startDate || undefined}
                            onChange={e => updatePhoto(index, { date: e.target.value || null })} />
                    )}
                    <FocalPointPicker imageUrl={photo.url.trim()} x={photo.focal_x} y={photo.focal_y}
                        onChange={(focal_x, focal_y) => updatePhoto(index, { focal_x, focal_y })} />
                </div>
            ))}
            <button type="button" onClick={() => onChange([...photos, { url: "", focal_x: 50, focal_y: 50 }])}>Add photo</button>
        </div>
    );
}
