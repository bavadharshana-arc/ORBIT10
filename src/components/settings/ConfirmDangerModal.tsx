import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { secondaryButtonStyle } from "./styles";

interface ConfirmDangerModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDangerModal({
  isOpen,
  title,
  description,
  confirmWord,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDangerModalProps) {
  const [value, setValue] = useState("");

  function handleCancel() {
    setValue("");
    onCancel();
  }

  function handleConfirm() {
    setValue("");
    onConfirm();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setValue("");
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const canConfirm = value === confirmWord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-black/30 backdrop-blur-[2px]"
      />

      <div
        className="fade-in shadow-float-lg"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: 20,
          background: "#FFFFFF",
          borderRadius: 18,
          padding: 24,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: "#20242B", margin: 0 }}>
            {title}
          </h3>

          <button type="button" onClick={handleCancel} aria-label="Close" style={{ border: "none", background: "#EEF2F6", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#667085" }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: "#667085", lineHeight: 1.6, marginBottom: 16 }}>{description}</p>

        <label style={{ fontSize: 11, fontWeight: 600, color: "#667085", display: "block", marginBottom: 6 }}>
          Type <strong style={{ color: "#20242B" }}>{confirmWord}</strong> to confirm
        </label>

        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{
            width: "100%",
            border: "1px solid #E9CCC6",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12.5,
            color: "#20242B",
            background: "#FBF2F1",
            outline: "none",
            marginBottom: 18,
          }}
        />

        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <button type="button" onClick={handleCancel} style={secondaryButtonStyle}>
            Cancel
          </button>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
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
