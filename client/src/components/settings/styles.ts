import type { CSSProperties } from "react";

export const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #E4E8ED",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 12.5,
  color: "#20242B",
  background: "#F7F8FA",
  outline: "none",
  fontFamily: "inherit",
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  fontWeight: 600,
  cursor: "pointer",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 84,
  lineHeight: 1.5,
};

export const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#667085",
  display: "block",
  marginBottom: 5,
};

export const primaryButtonStyle: CSSProperties = {
  background: "#20242B",
  color: "#F7F8FA",
  border: "none",
  borderRadius: 11,
  padding: "10px 18px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

export const secondaryButtonStyle: CSSProperties = {
  background: "#F7F8FA",
  color: "#667085",
  border: "1px solid #E4E8ED",
  borderRadius: 11,
  padding: "10px 16px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
