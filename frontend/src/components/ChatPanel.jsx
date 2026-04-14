import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

/**
 * Real-time chat panel with auto-scroll and per-room messages.
 */
export default function ChatPanel({ messages, onSend, username }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full" data-testid="chat-panel">
      {/* Message feed */}
      <ScrollArea className="flex-1 min-h-0 px-4 py-3">
        <div className="space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg, i) => {
            if (msg.isSystem) {
              return (
                <div
                  key={i}
                  className="text-center text-xs text-muted-foreground py-1"
                  data-testid="system-message"
                >
                  {msg.message}
                </div>
              );
            }

            const isOwn = msg.username === username;

            return (
              <div
                key={i}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                data-testid="chat-message"
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-sm text-sm ${
                    isOwn
                      ? "bg-[#F4F4F5] text-foreground"
                      : "bg-white border border-border text-foreground"
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      {msg.username}
                      {msg.color && msg.color !== "spectator" && (
                        <span className="ml-1 opacity-50">({msg.color})</span>
                      )}
                    </p>
                  )}
                  <p className="break-words">{msg.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="h-9 rounded-sm text-sm focus:ring-2 focus:ring-black focus:border-black"
          />
          <Button
            data-testid="send-message-button"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-9 w-9 rounded-sm bg-[#0A0A0A] hover:bg-[#0A0A0A]/90"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
