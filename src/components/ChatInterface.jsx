import { useState, useRef, useEffect } from "react";
import { queryLLM, formatResultNaturally } from "../services/llm";
import { runSQL } from "../data/database";

const SAMPLE_QUERIES = [
  "Which products are associated with the highest number of billing documents?",
  "Show sales orders with broken or incomplete flows",
  "What is the total revenue by customer?",
  "Which orders have been delivered but not billed?",
  "Show all outstanding or cancelled billing documents",
  "Which plant handles the most deliveries?",
];

function ResultTable({ columns, rows }) {
  if (!rows || rows.length === 0) return <div className="no-results">No results found.</div>;
  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead>
          <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell ?? "—"}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && <div className="table-overflow">Showing 20 of {rows.length} rows</div>}
    </div>
  );
}

function Message({ msg }) {
  const [showSQL, setShowSQL] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="msg msg-user">
        <div className="msg-bubble msg-bubble-user">{msg.content}</div>
      </div>
    );
  }

  if (msg.type === "off_topic") {
    return (
      <div className="msg msg-assistant">
        <div className="msg-avatar">⬡</div>
        <div className="msg-bubble msg-bubble-bot msg-bubble-warn">
          <span className="warn-icon">⚠️</span> {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "error") {
    return (
      <div className="msg msg-assistant">
        <div className="msg-avatar">⬡</div>
        <div className="msg-bubble msg-bubble-bot msg-bubble-error">
          <span>❌</span> {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "loading") {
    return (
      <div className="msg msg-assistant">
        <div className="msg-avatar">⬡</div>
        <div className="msg-bubble msg-bubble-bot">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar">⬡</div>
      <div className="msg-content-wrap">
        <div className="msg-bubble msg-bubble-bot">
          {msg.answer}
        </div>
        {msg.queryResult && (
          <div className="msg-extras">
            <button className="sql-toggle" onClick={() => setShowSQL(!showSQL)}>
              {showSQL ? "▲ Hide" : "▼ Show"} SQL
            </button>
            {showSQL && (
              <div className="sql-block">
                <pre>{msg.sql}</pre>
              </div>
            )}
            <ResultTable columns={msg.queryResult.columns} rows={msg.queryResult.rows} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatInterface({ onHighlight }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      type: "answer",
      answer: "Hello! I'm your business data analyst. Ask me anything about orders, deliveries, customers, billing documents, or explore the supply chain flow. I can run SQL queries and explain the results.",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { role: "user", content: userText };
    setMessages(prev => [...prev, userMsg, { role: "assistant", type: "loading" }]);
    setLoading(true);

    try {
      const llmResponse = await queryLLM(userText, history);

      if (llmResponse.type === "off_topic") {
        setMessages(prev => [...prev.slice(0, -1), {
          role: "assistant",
          type: "off_topic",
          content: llmResponse.message
        }]);
        setHistory(prev => [...prev,
          { role: "user", content: userText },
          { role: "assistant", content: llmResponse.message }
        ]);
        return;
      }

      if (llmResponse.type === "query") {
        const queryResult = runSQL(llmResponse.sql);
        const answer = await formatResultNaturally(userText, llmResponse.sql, queryResult, history);

        // Extract IDs from results to highlight in graph
        const highlightIds = [];
        if (queryResult.columns && queryResult.rows) {
          queryResult.rows.forEach(row => {
            row.forEach((cell, i) => {
              const col = queryResult.columns[i]?.toLowerCase();
              if (col === 'id' || col === 'so_id' || col === 'billing_id' || col === 'delivery_id') {
                if (cell) highlightIds.push(cell);
              }
            });
          });
        }
        if (highlightIds.length > 0) onHighlight(highlightIds);

        setMessages(prev => [...prev.slice(0, -1), {
          role: "assistant",
          type: "answer",
          answer,
          sql: llmResponse.sql,
          queryResult,
          explanation: llmResponse.explanation,
        }]);

        setHistory(prev => [...prev,
          { role: "user", content: userText },
          { role: "assistant", content: answer }
        ]);
      }
    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: "assistant",
        type: "error",
        content: `Error: ${err.message}. Please try again.`
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span className="chat-title">⬡ Query Interface</span>
        <span className="chat-subtitle">Natural Language → SQL</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      <div className="sample-queries">
        {SAMPLE_QUERIES.slice(0, 3).map((q, i) => (
          <button key={i} className="sample-btn" onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about orders, deliveries, billing..."
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? "⟳" : "→"}
        </button>
      </div>
    </div>
  );
}
