import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Camera, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { hasOpenAIProjectConfig, openAIConfig } from "@/lib/openai-config";

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
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function BookingChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    setIsStarting(true);
    const conv = await base44.agents.createConversation({
      agent_name: "booking_assistant",
      metadata: {
        name: "New Booking Inquiry",
        integration: {
          provider: "openai",
          project_name: openAIConfig.projectName,
          project_id: openAIConfig.projectId,
          api_key: openAIConfig.apiKey || undefined
        }
      },
    });
    setConversation(conv);

    if (!hasOpenAIProjectConfig) {
      console.warn("OpenAI project settings are missing. Configure VITE_OPENAI_PROJECT_NAME and VITE_OPENAI_PROJECT_ID.");
    }

    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });

    // Trigger initial greeting
    await base44.agents.addMessage(conv, {
      role: "user",
      content: "Hello, I'd like to book a session.",
    });

    setIsStarting(false);
    return () => unsubscribe();
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || isLoading) return;
    const text = input.trim();
    setInput("");
    setIsLoading(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const visibleMessages = messages.filter((m) => m.role !== "system");
  // Hide the initial trigger message sent by us
  const displayMessages = visibleMessages.filter((m, i) => !(i === 0 && m.role === "user" && m.content === "Hello, I'd like to book a session."));

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
        {isStarting ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-sm">Starting your session...</p>
            </div>
          </div>
        ) : (
          <>
            {displayMessages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && (
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
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card rounded-b-xl">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isStarting || isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStarting || isLoading}
            size="icon"
            className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Your booking request will be reviewed by our team
        </p>
      </div>
    </div>
  );
}
