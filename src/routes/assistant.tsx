import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/assistant")({
  component: () => <ProtectedRoute><Assistant /></ProtectedRoute>,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Can I claim ITC on a hotel bill from another state?",
  "What is due this month for filing?",
  "Explain GSTR-2B vs GSTR-2A",
  "How to handle reverse charge mechanism?",
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setBusy(true);
    let acc = "";
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gst-chatbot`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next }),
      });
      if (resp.status === 429) throw new Error("Too many requests — please wait a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      if (!resp.ok || !resp.body) throw new Error("Chat failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(m => {
                const last = m[m.length - 1];
                if (last?.role === "assistant") return m.map((x, i) => i === m.length - 1 ? { ...x, content: acc } : x);
                return [...m, { role: "assistant", content: acc }];
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AppLayout title="AI Assistant" subtitle="Ask anything about Indian GST compliance">
      <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto bg-card border rounded-2xl shadow-card overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!messages.length && (
            <div className="text-center py-10">
              <div className="h-12 w-12 mx-auto rounded-2xl gradient-primary grid place-items-center shadow-glow mb-3"><Sparkles className="h-6 w-6 text-white" /></div>
              <h3 className="font-semibold">Your GST AI Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1">Ask about ITC, filings, GSTIN — get instant guidance.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-lg border bg-background hover:bg-accent transition text-sm">
                    <MessageSquare className="h-3.5 w-3.5 inline mr-2 text-primary" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center shrink-0"><Sparkles className="h-4 w-4 text-white" /></div>}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "assistant"
                  ? <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  : <p>{m.content}</p>}
              </div>
            </div>
          ))}
          {busy && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3"><div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center"><Loader2 className="h-4 w-4 text-white animate-spin" /></div><div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div></div>
          )}
        </div>
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t p-3 flex gap-2 bg-background">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about GST…" disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy || !input.trim()} className="px-4 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-2">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
