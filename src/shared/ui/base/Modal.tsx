import React from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, onClose, footer, children }) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>("[data-autofocus]") ?? el;
    target.focus({ preventScroll: true });
  }, []);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles._backdrop} onMouseDown={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={styles._modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles._header}>
          <h2 className={styles._title} id={titleId}>
            {title}
          </h2>
          <button type="button" className={styles._close} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles._body}>{children}</div>
        {footer && <div className={styles._footer}>{footer}</div>}
      </div>
    </div>
  );
};
