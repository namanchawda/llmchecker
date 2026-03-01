'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../app/context/AuthContext';
import { Settings, ArrowUp, Zap } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function PlaygroundChat() {
  const { token } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [running, setRunning] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, running]);

  async function send() {
    if (!input.trim() || !apiKey || running) return;

    const prompt = input.trim();
    setInput('');
    setRunning(true);
    setResponseTime(null);

    setMessages((m) => [...m, { role: 'user', content: prompt }]);

    const start = performance.now();

    try {
      const res = await fetch('http://localhost:3001/playground/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model, prompt, apiKey }),
      });

      const data = await res.json();
      setResponseTime(Math.round(performance.now() - start));

      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.response ?? 'No response' },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: '❌ Network error' },
      ]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-20px)] overflow-hidden">


      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold">Playground</div>

        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="
                  hidden sm:flex
                  items-center
                  px-3 py-1.5
                  rounded-full
                  bg-white/5
                  border border-white/10
                  text-sm
                  text-slate-300
                "
          >
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4o">gpt-4o</option>
          </select>

          <button onClick={() => setShowConfig((v) => !v)} className="pill">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* API KEY */}
      {showConfig && (
        <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/5">
          <div className="text-xs muted mb-1">OpenAI API Key</div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="input w-full"
          />
        </div>
      )}

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-none">
        <div className="max-w-3xl mx-auto space-y-5">

          {messages.length === 0 && !running && (
            <div className="muted text-sm text-center mt-32">
              Enter your API key and ask something to begin
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`
                  max-w-[75%]
                  px-4 py-3
                  rounded-2xl
                  text-sm
                  leading-relaxed
                  whitespace-pre-wrap
                  ${
                    m.role === 'user'
                      ? 'bg-blue-500/15 border border-blue-500/30 text-blue-100'
                      : 'bg-white/5 border border-white/10 text-slate-200'
                  }
                `}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* THINKING INDICATOR */}
          {running && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-150">●</span>
                <span className="animate-pulse delay-300">●</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-4">
        {responseTime !== null && (
          <div className="text-right text-xs muted mb-1 flex justify-end items-center gap-1">
            <Zap size={12} /> {responseTime} ms
          </div>
        )}

        <div className="relative max-w-3xl mx-auto">
          <TextareaAutosize
            minRows={1}
            maxRows={6}

            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Playground…"
            className="input w-full pr-12 resize-none"
          />

          <button
            onClick={send}
            disabled={!input || running || !apiKey}
            className="
            absolute right-2 top-1/2 -translate-y-1/2
            p-2 h-8 w-8
            flex items-center justify-center
            rounded-full
            bg-white
            text-black
            disabled:opacity-40
                "
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
