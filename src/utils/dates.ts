/** Today's date as YYYY-MM-DD in the viewer's local time zone. */
export const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
