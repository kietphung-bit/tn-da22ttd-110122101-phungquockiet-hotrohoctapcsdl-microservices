import { useEffect, type MouseEvent } from "react";

type ConfirmDialogVariant = "normal" | "warning" | "danger";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant?: ConfirmDialogVariant;
    isConfirming?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const ConfirmDialog = ({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = "normal",
    isConfirming = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) => {
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isConfirming) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isConfirming, onCancel, open]);

    if (!open) {
        return null;
    }

    const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !isConfirming) {
            onCancel();
        }
    };

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
            <section
                className={`modal-card confirm-dialog confirm-dialog--${variant}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                <div className="modal-header confirm-dialog__header">
                    <h2 id="confirm-dialog-title">{title}</h2>
                </div>
                <p id="confirm-dialog-message" className="confirm-dialog__message">
                    {message}
                </p>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`btn confirm-dialog__confirm confirm-dialog__confirm--${variant}`}
                        onClick={onConfirm}
                        disabled={isConfirming}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ConfirmDialog;
