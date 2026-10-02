/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_SHOW_EVENT_VIEW_NAVIGATION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    twttr?: { widgets?: { load: (element?: HTMLElement) => void } };
    instgrm?: { Embeds?: { process: () => void } };
    _twScriptLoaded?: boolean;
}
