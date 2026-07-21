import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const STORAGE_KEY = "bdf_chat_history";

const SUGGESTIONS = [
  "Who is eligible to donate blood?",
  "How often can I donate?",
  "What blood types are compatible?",
  "What should I do before donating?",
];

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // localStorage can fail in private-browsing modes — chat still works, just won't persist
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const handleSend = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      const { reply } = await api.sendChatMessage(nextMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-title">Ask about blood donation</div>
            <div className="chat-header-actions">
              <button className="chat-header-btn" onClick={handleClear} title="Clear conversation">
                Clear
              </button>
              <button className="chat-header-btn" onClick={() => setOpen(false)} title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <>
                <div className="chat-bubble chat-bubble-assistant">
                  Hi! I can answer questions about blood donation — eligibility, how often you can donate, blood
                  type compatibility, and more. What would you like to know?
                </div>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="chat-suggestion-chip" onClick={() => handleSend(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                {m.content}
              </div>
            ))}

            {sending && (
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            )}

            {error && <div className="chat-bubble chat-bubble-error">⚠️ {error}</div>}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={2000}
              disabled={sending}
            />
            <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}

      <button className="chat-launcher" onClick={() => setOpen((o) => !o)} aria-label="Toggle chat">
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
