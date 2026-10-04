const VISITOR_PREVIEW_KEY = "visitor_preview";

export function hasAdminSession() {
    return Boolean(localStorage.getItem("jwt"));
}

export function isVisitorPreview() {
    return hasAdminSession() && sessionStorage.getItem(VISITOR_PREVIEW_KEY) === "1";
}

export function isAdminView() {
    return hasAdminSession() && !isVisitorPreview();
}

export function setVisitorPreview(enabled: boolean) {
    if (enabled) {
        sessionStorage.setItem(VISITOR_PREVIEW_KEY, "1");
    } else {
        sessionStorage.removeItem(VISITOR_PREVIEW_KEY);
    }
}
