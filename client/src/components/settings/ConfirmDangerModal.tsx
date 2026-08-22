import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { secondaryButtonStyle } from "./styles";

interface ConfirmDangerModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  /** True while the confirmed action is in flight — locks Cancel/backdrop/Escape dismissal and blocks a second submit. */
  pending?: boolean;
  /** Surfaced inside the modal (not behind it) so a failed attempt is visible without closing the dialog. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDangerModal({
  isOpen,
  title,
  description,
  confirmWord,
  confirmLabel,
  pending = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDangerModalProps) {
  const [value, setValue] = useState("");

  function handleCancel() {
    if (pending) return;
    setValue("");
    onCancel();
  }

  function handleConfirm() {
    if (pending) return;
    onConfirm();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        setValue("");
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pending, onCancel]);

  if (!isOpen) {
    return null;
  }

  const canConfirm = value === confirmWord && !pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        disabled={pending}
        className="absolute inset-0 h-full w-full cursor-default bg-black/30 backdrop-blur-[2px]"
      />

      <div
        className="fade-in shadow-float-lg"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: 20,
          background: "var(--card)",
          borderRadius: 18,
          padding: 24,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            {title}
          </h3>

          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            aria-label="Close"
            className="focus-ring"
            style={{
              border: "none",
              background: "var(--surface-2)",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
              color: "var(--text-2)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 16 }}>{description}</p>

        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
          Type <strong style={{ color: "var(--text)" }}>{confirmWord}</strong> to confirm
        </label>

        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={pending}
          className="focus-ring"
          style={{
            width: "100%",
            border: "1px solid #E9CCC6",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12.5,
            color: "var(--text)",
            background: "#FBF2F1",
            marginBottom: error ? 10 : 18,
          }}
        />

        {error && (
          <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#B3564B", lineHeight: 1.5 }}>{error}</p>
        )}

        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <button type="button" onClick={handleCancel} disabled={pending} className="focus-ring" style={{ ...secondaryButtonStyle, opacity: pending ? 0.6 : 1, cursor: pending ? "not-allowed" : "pointer" }}>
            Cancel
          </button>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="focus-ring"
            style={{
              background: canConfirm ? "#B3564B" : "#E9CCC6",
              color: "#FFF8F6",
              border: "none",
              borderRadius: 11,
              padding: "10px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
