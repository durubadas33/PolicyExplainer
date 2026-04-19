import { useState, useRef, useEffect, useCallback } from 'react';
import { POLICY_CATEGORIES } from './constants/categories';
import { callClaude, SYSTEM_EXPLAINER, SYSTEM_QA } from './api/claude';
import { extractPdfText } from './utils/pdfLoader';
import ExplanationCard from './components/ExplanationCard';
import styles from './styles/styles';

export default function PolicyExplainer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [uploadedText, setUploadedText] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg) =>
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Date.now() + Math.random() },
    ]);

  const explainPolicy = useCallback(async (policyName, docText = null) => {
    setLoading(true);
    const userContent = docText
      ? `Please explain this policy document in plain language:\n\n${docText.slice(0, 3000)}`
      : `Please explain the "${policyName}" policy in plain language for ordinary citizens.`;

    addMessage({ role: 'user', content: policyName || 'Uploaded Document' });

    try {
      const raw = await callClaude(
        [{ role: 'user', content: userContent }],
        SYSTEM_EXPLAINER,
      );
      let parsed;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          summary: raw,
          keyPoints: [],
          requiredActions: [],
          impacts: [],
          readingLevel: 'N/A',
        };
      }
      addMessage({
        role: 'assistant',
        type: 'explanation',
        data: parsed,
        policy: policyName, // Use policyName argument instead of uploadedName state
      });
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `Sorry, I couldn't analyze this policy right now. Error: ${err.message}`,
      });
    }
    setLoading(false);
  }, []);

  const askQuestion = useCallback(async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setLoading(true);
    addMessage({ role: 'user', content: q });

    const lastExplanation = [...messages]
      .reverse()
      .find((m) => m.type === 'explanation');
    const context = lastExplanation
      ? `Current policy context: ${lastExplanation.policy}\nSummary: ${lastExplanation.data?.summary}`
      : 'No specific policy loaded.';

    try {
      const answer = await callClaude(
        [{ role: 'user', content: `${context}\n\nCitizen question: ${q}` }],
        SYSTEM_QA,
      );
      addMessage({ role: 'assistant', content: answer });
    } catch {
      addMessage({
        role: 'assistant',
        content: "I couldn't process your question. Please try again.",
      });
    }
    setLoading(false);
  }, [input, loading, messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    setPdfProcessing(true);
    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim())
        throw new Error('No text could be extracted from this file.');
      setUploadedName(file.name);
      setUploadedText(text);
      setShowUpload(false);
      setPdfProcessing(false);
      setPdfFileName('');
      await explainPolicy(file.name, text);
    } catch (err) {
      setPdfProcessing(false);
      setPdfFileName('');
      alert(`Error reading file: ${err.message}`);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const giveFeedback = (msgId, val) =>
    setFeedback((prev) => ({ ...prev, [msgId]: val }));

  const clearChat = () => {
    setMessages([]);
    setUploadedText('');
    setUploadedName('');
  };

  return (
    <div style={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarOpen ? 280 : 0,
          overflow: sidebarOpen ? 'auto' : 'hidden',
        }}
      >
        <div style={styles.sidebarInner}>
          <div style={styles.sidebarHeader}>
            <span style={styles.logoText}>PolicyClear</span>
            <span style={styles.logoSub}>AI Policy Explainer</span>
          </div>

          <button style={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <span>📄</span> Upload Document
          </button>

          {Object.entries(POLICY_CATEGORIES).map(([key, cat]) => (
            <div key={key} style={styles.catSection}>
              <button
                style={{
                  ...styles.catHeader,
                  background:
                    activeCategory === key ? cat.color + '22' : 'transparent',
                  borderLeft:
                    activeCategory === key
                      ? `3px solid ${cat.color}`
                      : '3px solid transparent',
                }}
                onClick={() =>
                  setActiveCategory(activeCategory === key ? null : key)
                }
              >
                <span>{cat.icon}</span>
                <span style={styles.catTitle}>{cat.title}</span>
                <span
                  style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}
                >
                  {activeCategory === key ? '▲' : '▼'}
                </span>
              </button>

              {activeCategory === key && (
                <div style={styles.catOptions}>
                  {cat.options.map((opt) => (
                    <button
                      key={opt}
                      style={styles.optionBtn}
                      onClick={() => explainPolicy(opt)}
                      disabled={loading}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {messages.length > 0 && (
            <button style={styles.clearBtn} onClick={clearChat}>
              🗑 Clear Chat
            </button>
          )}

          <div style={styles.copyright}>© Dhrubajyoti Das</div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <button
            style={styles.menuBtn}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div>
            <div style={styles.topTitle}>Plain Language Policy Explainer</div>
            <div style={styles.topSub}>
              Select a policy or upload a document to get started
            </div>
          </div>
          <div style={styles.badge}>🤖 Powered by AI</div>
        </div>

        {/* Chat area */}
        <div style={styles.chatArea}>
          {messages.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <h2 style={styles.emptyTitle}>Understand Any Policy Instantly</h2>
              <p style={styles.emptySub}>
                Choose a policy from the sidebar, or upload your own document.
                I'll translate complex bureaucratic language into clear, plain
                English with required actions highlighted.
              </p>
              <div style={styles.emptyCards}>
                {[
                  { icon: '🔍', text: 'Plain Language Summaries' },
                  { icon: '✅', text: 'Required Actions Listed' },
                  { icon: '💬', text: 'Ask Follow-up Questions' },
                  { icon: '📤', text: 'Upload PDF/Text Docs' },
                ].map((c) => (
                  <div key={c.text} style={styles.emptyCard}>
                    <span style={{ fontSize: 24 }}>{c.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {c.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  justifyContent:
                    msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={styles.avatar}>🤖</div>
                )}
                <div
                  style={{
                    ...styles.bubble,
                    ...(msg.role === 'user'
                      ? styles.userBubble
                      : styles.botBubble),
                    maxWidth: msg.type === 'explanation' ? '90%' : '75%',
                  }}
                >
                  {msg.type === 'explanation' ? (
                    <ExplanationCard
                      data={msg.data}
                      policy={msg.policy}
                      msgId={msg.id}
                      feedback={feedback}
                      onFeedback={giveFeedback}
                    />
                  ) : (
                    <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>
                      {msg.content}
                    </p>
                  )}
                </div>
                {msg.role === 'user' && <div style={styles.userAvatar}>👤</div>}
              </div>
            ))
          )}

          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
              <div style={styles.avatar}>🤖</div>
              <div style={{ ...styles.bubble, ...styles.botBubble }}>
                <div style={styles.typing}>
                  <span style={{ ...styles.dot, animationDelay: '0s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={styles.inputBar}>
          <div style={styles.inputWrap}>
            <textarea
              ref={textareaRef}
              rows={1}
              style={styles.input}
              placeholder="Ask a follow-up question about any policy… (e.g. 'What happens if I don't comply?')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || loading ? 0.4 : 1,
              }}
              onClick={askQuestion}
              disabled={!input.trim() || loading}
            >
              ➤
            </button>
          </div>
          <p style={styles.hint}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>

      {/* ── Upload Modal ─────────────────────────────────── */}
      {showUpload && (
        <div
          style={styles.overlay}
          onClick={() => !pdfProcessing && setShowUpload(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                Upload Policy Document
              </h3>
              <button
                style={styles.closeBtn}
                onClick={() => !pdfProcessing && setShowUpload(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {pdfProcessing ? (
                <div style={styles.processingBox}>
                  <div style={styles.spinnerWrap}>
                    <div style={styles.spinner} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    Extracting text from PDF…
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {pdfFileName}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    This may take a few seconds
                  </div>
                </div>
              ) : (
                <>
                  <label style={styles.fileZone} htmlFor="file-upload">
                    <span style={{ fontSize: 36 }}>📂</span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      Click to choose a file
                    </span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      PDF, TXT, MD — PDF text is auto-extracted
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".txt,.pdf,.md,.doc,.docx"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </label>

                  <div style={styles.orDivider}>OR</div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 4,
                    }}
                  >
                    Paste policy text directly:
                  </div>
                  <textarea
                    rows={8}
                    style={styles.pasteArea}
                    placeholder="Paste policy text here..."
                    onChange={(e) => setUploadedText(e.target.value)}
                  />

                  <div style={styles.modalActions}>
                    <button
                      style={styles.cancelBtn}
                      onClick={() => setShowUpload(false)}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        ...styles.analyzeBtn,
                        opacity: uploadedText ? 1 : 0.5,
                      }}
                      disabled={!uploadedText}
                      onClick={() => {
                        setShowUpload(false);
                        explainPolicy('Pasted Document', uploadedText);
                      }}
                    >
                      Analyze & Simplify →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
