import { useState, useRef, useEffect } from "react";
import styles from "../styles/styles";
import Section from "./Section";
import Item from "./Item";

export default function ExplanationCard({ data, policy, msgId, feedback, onFeedback }) {
  const fb = feedback[msgId];
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef(null);

  // iOS loads voices asynchronously — preload them
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    synth.onvoiceschanged = () => synth.getVoices();
  }, []);

  // Chrome long-text keepalive fix
  useEffect(() => {
    let interval;
    if (speaking && !paused) {
      interval = setInterval(() => {
        const s = window.speechSynthesis;
        if (s && s.speaking && !s.paused) { s.pause(); s.resume(); }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [speaking, paused]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const buildSpeechText = () => {
    let text = `Policy: ${policy}. Summary: ${data.summary}.`;
    if (data.keyPoints?.length > 0)
      text += " Key Points: " + data.keyPoints.join(". ") + ".";
    if (data.requiredActions?.length > 0)
      text += " What you need to do: " + data.requiredActions.join(". ") + ".";
    if (data.impacts?.length > 0)
      text += " How this affects you: " + data.impacts.join(". ") + ".";
    return text;
  };

  const handleListen = () => {
    const synth = window.speechSynthesis;
    if (!synth) return alert("Text-to-speech is not supported in your browser.");

    if (paused) { synth.resume(); setPaused(false); return; }
    if (speaking) { synth.pause(); setPaused(true); return; }

    synth.cancel();

    const text = buildSpeechText();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;

    const voices = synth.getVoices();
    const engVoice =
      voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Google")) ||
      voices[0];
    if (engVoice) utter.voice = engVoice;

    utter.onend = () => { setSpeaking(false); setPaused(false); };
    utter.onerror = (e) => {
      if (e.error !== "interrupted") { setSpeaking(false); setPaused(false); }
    };

    utteranceRef.current = utter;
    synth.speak(utter);
    setSpeaking(true);
    setPaused(false);
  };

  const handleStop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardPolicy}>{policy}</span>
        <span style={styles.readingBadge}>{data.readingLevel || "Moderate"} complexity</span>
      </div>

      <p style={styles.cardSummary}>{data.summary}</p>

      {data.keyPoints?.length > 0 && (
        <Section title="🔑 Key Points" color="#6366f1">
          {data.keyPoints.map((p, i) => (
            <Item key={i} text={p} bullet="•" color="#6366f1" />
          ))}
        </Section>
      )}

      {data.requiredActions?.length > 0 && (
        <Section title="✅ What You Need To Do" color="#10b981">
          {data.requiredActions.map((a, i) => (
            <Item key={i} text={a} bullet="→" color="#10b981" />
          ))}
        </Section>
      )}

      {data.impacts?.length > 0 && (
        <Section title="💡 How This Affects You" color="#f59e0b">
          {data.impacts.map((imp, i) => (
            <Item key={i} text={imp} bullet="▸" color="#f59e0b" />
          ))}
        </Section>
      )}

      {/* Audio Listen Bar */}
      <div style={styles.audioBar}>
        <span style={styles.audioLabel}>🔊 Listen to this policy</span>
        <div style={styles.audioControls}>
          <button
            style={{
              ...styles.audioBtn,
              background: speaking && !paused ? "#fef3c7" : "#eff6ff",
              color: speaking && !paused ? "#d97706" : "#1d4ed8",
            }}
            onClick={handleListen}
            title={paused ? "Resume" : speaking ? "Pause" : "Play"}
          >
            {paused ? "▶ Resume" : speaking ? "⏸ Pause" : "▶ Play"}
          </button>
          {speaking && (
            <button
              style={{ ...styles.audioBtn, background: "#fee2e2", color: "#dc2626" }}
              onClick={handleStop}
              title="Stop"
            >
              ⏹ Stop
            </button>
          )}
        </div>
        {speaking && !paused && (
          <div style={styles.waveWrap}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ ...styles.wave, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
      </div>

      <div style={styles.fbRow}>
        <span style={{ fontSize: 12, color: "#888" }}>Was this helpful?</span>
        {["👍", "👎"].map((emoji, i) => {
          const val = i === 0 ? "up" : "down";
          return (
            <button
              key={val}
              style={{ ...styles.fbBtn, background: fb === val ? "#f0f0f0" : "transparent" }}
              onClick={() => onFeedback(msgId, val)}
            >
              {emoji}
            </button>
          );
        })}
        {fb && (
          <span style={{ fontSize: 12, color: "#10b981" }}>
            {fb === "up" ? "Thanks for the feedback!" : "We'll improve this."}
          </span>
        )}
      </div>
    </div>
  );
}
