function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day };
}

function formatMonthDay(date) {
    return new Date(date.year, date.month - 1, date.day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function formatCardDateRange(item) {
    const start = parseDate(item.start_date);
    const end = parseDate(item.end_date);

    if (!start) return item.year || "";
    if (!end || item.start_date === item.end_date) {
        return `${formatMonthDay(start)}, ${start.year}`;
    }

    if (start.year === end.year && start.month === end.month) {
        const month = new Date(start.year, start.month - 1, start.day).toLocaleDateString("en-US", { month: "short" });
        return `${month} ${start.day}-${end.day}, ${start.year}`;
    }

    if (start.year === end.year) {
        return `${formatMonthDay(start)}-${formatMonthDay(end)}, ${start.year}`;
    }

    return `${formatMonthDay(start)} '${String(start.year).slice(-2)}-${formatMonthDay(end)} '${String(end.year).slice(-2)}`;
}
