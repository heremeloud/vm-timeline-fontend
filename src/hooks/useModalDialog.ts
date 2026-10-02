import { useEffect, useRef } from "react";

/**
 * Drive a native <dialog> from state: it opens as a modal while `open` is true,
 * closes when it turns false, and calls `onClose` when the user dismisses it
 * (Escape, backdrop click, or an explicit `close()`).
 */
export default function useModalDialog(open: boolean, onClose: () => void) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [open]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const handleClose = () => onCloseRef.current();
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    return dialogRef;
}
