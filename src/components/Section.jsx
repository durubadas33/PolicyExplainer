import styles from "../styles/styles";

export default function Section({ title, color, children }) {
  return (
    <div style={{ ...styles.section, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
