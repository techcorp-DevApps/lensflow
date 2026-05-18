import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Camera, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { openAIConfig } from "@/lib/openai-config";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your LensFlow booking assistant. Tell me a bit about the session you're hoping to book — type of shoot, ideal date, location, and anything else on your mind — and I'll help you put a request together.",
  _local: true,
};

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  if (message.role === "system") return null;

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
          <Camera className="w-4 h-4 text-accent" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent text-accent-foreground rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
            }}
          >
            {message.content || "…"}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function BookingChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [streamingContent, setStreamingContent] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    if (startedRef.current) return null;
    startedRef.current = true;
    setIsStarting(true);
    try {
      const conv = await base44.agents.createConversation({
        title: "New Booking Inquiry",
        metadata: {
          name: "New Booking Inquiry",
          integration: {
            provider: "openai",
            project_name: openAIConfig.projectName || undefined,
            project_id: openAIConfig.projectId || undefined,
          },
        },
      });
      setConversation(conv);
      return conv;
    } catch (err) {
      startedRef.current = false;
      setError(err?.message || "Unable to start a chat session right now.");
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text, _local: true }]);
    setIsLoading(true);
    setStreamingContent("");

    try {
      const conv = await ensureConversation();
      if (!conv) {
        setIsLoading(false);
        return;
      }

      let streamed = "";
      let finalAssistant = null;

      const result = await base44.agents.streamMessage(conv, { role: "user", content: text }, {
        onEvent: (event, payload) => {
          if (event === "token" && payload?.delta) {
            streamed += payload.delta;
            setStreamingContent(streamed);
          } else if (event === "assistant_message") {
            finalAssistant = payload;
          }
        },
      });

      if (result.accepted) {
        // The server has already persisted the user message. Never retry; that
        // would double-submit and could trigger duplicate tool calls (e.g. a
        // second booking record). Surface any stream error directly instead.
        finalAssistant = result.assistantMessage || finalAssistant;
        if (!finalAssistant && result.error) {
          setError(result.error.message || "The assistant ran into an error.");
        }
      } else {
        // Stream was rejected before anything was persisted — safe to fall
        // back to the non-streaming JSON endpoint.
        try {
          const reply = await base44.agents.addMessage(conv, { role: "user", content: text });
          if (reply && reply.role && reply.content) {
            finalAssistant = reply;
          }
        } catch (fallbackErr) {
          setError(fallbackErr?.message || result.error?.message || "We couldn't send your message. Please try again.");
        }
      }

      if (finalAssistant) {
        setMessages((prev) => [...prev, finalAssistant]);
      }
    } catch (err) {
      setError(err?.message || "We couldn't send your message. Please try again.");
    } finally {
      setStreamingContent("");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card rounded-t-xl">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <Camera className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-foreground">LensFlow Booking Assistant</h2>
          <p className="text-xs text-muted-foreground">Let's find the perfect session for you</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-background">
        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {streamingContent && (
          <MessageBubble message={{ role: "assistant", content: streamingContent }} />
        )}

        {(isLoading || isStarting) && !streamingContent && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mt-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card rounded-b-xl">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading || isStarting}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isStarting}
            size="icon"
            className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
          >
            {isLoading || isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Your booking request will be reviewed by our team
        </p>
      </div>
    </div>
  );
}
