interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  accent?: string;
  label?: string;
}

/** A small pill toggle switch, used for boolean preferences (notifications, 2FA, etc). */
export function Switch({ checked, onChange, disabled = false, accent = "#20242B", label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        border: "none",
        padding: 3,
        background: disabled ? "#E4E8ED" : checked ? accent : "#E4E8ED",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        transition: "background 160ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(32,36,43,0.25)",
          transition: "transform 160ms ease",
        }}
      />
    </button>
  );
}
