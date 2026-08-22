interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  accent?: string;
  label?: string;
}

/** A small pill toggle switch, used for boolean preferences (notifications, 2FA, etc). */
export function Switch({ checked, onChange, disabled = false, accent = "var(--text)", label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="focus-ring"
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        border: "none",
        padding: 2,
        background: disabled ? "var(--surface-2)" : checked ? accent : "var(--surface-2)",
        boxShadow: disabled || checked ? "none" : "inset 0 0 0 1px var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 160ms ease, box-shadow 160ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(32,36,43,0.3)",
          transform: checked ? "translateX(14px)" : "translateX(0)",
          transition: "transform 160ms ease",
        }}
      />
    </button>
  );
}
