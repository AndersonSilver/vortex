import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "default" | "lg";
}

export function Modal({ open, onClose, title, children, size = "default" }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${size === "lg" ? " modal-lg" : ""}`}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
