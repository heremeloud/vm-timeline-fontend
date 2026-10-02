export interface DefaultTagOption {
    key: string;
    label: string;
    value: string;
    defaultChecked: boolean;
    row: "couple" | "view" | "mim";
}

/** Shortcut hashtags offered on the event forms. `defaultChecked` applies to new events only. */
export const DEFAULT_TAG_OPTIONS: DefaultTagOption[] = [
    { key: "viewmim", label: "ViewMim", value: "ViewMim", defaultChecked: true, row: "couple" },
    { key: "viewmim-th", label: "วิวมิ้ม", value: "วิวมิ้ม", defaultChecked: true, row: "couple" },
    { key: "vimmy", label: "VIMMY", value: "VIMMY", defaultChecked: false, row: "couple" },
    { key: "viewbenyapa", label: "viewbenyapa", value: "viewbenyapa", defaultChecked: false, row: "view" },
    { key: "view-th", label: "วิวเบญญาภา", value: "วิวเบญญาภา", defaultChecked: false, row: "view" },
    { key: "view-fandom", label: "สระอิของวว", value: "สระอิของวว", defaultChecked: false, row: "view" },
    { key: "mimrattanawadee", label: "mimrattanawadee", value: "mimrattanawadee", defaultChecked: false, row: "mim" },
    { key: "mim-th", label: "มิ้มรัตนวดี", value: "มิ้มรัตนวดี", defaultChecked: false, row: "mim" },
    { key: "mim-fandom", label: "ด้อมเป็ดจิ๋ว", value: "ด้อมเป็ดจิ๋ว", defaultChecked: false, row: "mim" },
];
