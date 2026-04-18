import '../styles/styles';

export default function Item({ text, bullet, color }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 6,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color, fontSize: 13, marginTop: 1, flexShrink: 0 }}>
        {bullet}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: '#374151' }}>
        {text}
      </span>
    </div>
  );
}
