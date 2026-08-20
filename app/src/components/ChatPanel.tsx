import { useState } from 'react';
import type { Building, ChatMessage } from '../types';
import { formatAssistantReply, parseQuery, searchBuildings } from '../data/chatEngine';

const SUGGESTIONS = ['강남구 아파트 12억 이하', '마포구 오피스텔', '20평대 아파트'];

interface ChatPanelProps {
  onResultsChange: (results: Building[]) => void;
}

export function ChatPanel({ onResultsChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: '안녕하세요. 원하는 지역·매물유형·예산을 말씀해주시면 후보 건물을 찾아드릴게요. (예: "강남구 아파트 12억 이하")',
    },
  ]);
  const [input, setInput] = useState('');

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const filters = parseQuery(trimmed);
    const results = searchBuildings(filters);
    const reply = formatAssistantReply(filters, results);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: reply },
    ]);
    onResultsChange(results);
    setInput('');
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <span className="chat-panel__badge">MOCK</span>
        AI 임장 어시스턴트
      </div>
      <div className="chat-panel__messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-panel__suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chat-suggestion" onClick={() => handleSend(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="chat-panel__input-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 강남구 아파트 10억 이하"
          aria-label="조건 입력"
        />
        <button type="submit">보내기</button>
      </form>
    </div>
  );
}
