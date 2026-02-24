"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import {
  isConversationMessage,
  isUserMessage,
  useVoiceBot,
  VoiceBotStatus,
  type AssistantMessage,
  type ConversationMessage,
} from "../context/VoiceBotContextProvider";

function useTypewriter(text: string, speed = 18, enabled = true): string {
  const [displayedLength, setDisplayedLength] = useState(0);
  const animatedTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (animatedTextRef.current !== text) {
      animatedTextRef.current = text;
      setDisplayedLength(0);
    }
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (displayedLength >= text.length) return;

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + 1, text.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedLength, text, speed, enabled]);

  if (!enabled) return text;
  return text.slice(0, displayedLength);
}

function MessageBubble({ message, isLatest }: { message: ConversationMessage; isLatest: boolean }) {
  const isUser = isUserMessage(message);
  const shouldAnimate = isLatest && !isUser;
  const rawText = isUser ? message.user || "(inaudible)" : (message as AssistantMessage).assistant;
  const displayText = useTypewriter(rawText, 18, shouldAnimate);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600/20 border border-blue-500/20 text-blue-100"
            : "bg-white/[0.07] border border-white/10 text-gray-200"
        }`}
      >
        <span
          className={`block text-[10px] font-medium uppercase tracking-wider mb-1 ${
            isUser ? "text-blue-400/70" : "text-gray-500"
          }`}
        >
          {isUser ? "You" : "Interviewer"}
        </span>
        {displayText}
        {shouldAnimate && displayText.length < rawText.length && (
          <span className="inline-block w-[2px] h-[1em] bg-gray-400 ml-0.5 animate-pulse align-text-bottom" />
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: VoiceBotStatus }) {
  if (status === VoiceBotStatus.LISTENING) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400/80">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        Listening...
      </div>
    );
  }

  if (status === VoiceBotStatus.SPEAKING) {
    return (
      <div className="flex items-center gap-2 text-xs text-purple-400/80">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
        </span>
        Speaking...
      </div>
    );
  }

  if (status === VoiceBotStatus.THINKING) {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-400/80">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
        </span>
        Thinking...
      </div>
    );
  }

  return null;
}

export default function InterviewTranscript() {
  const { displayOrder, status } = useVoiceBot();
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationMessages = displayOrder.filter(isConversationMessage);

  // Scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayOrder]);

  // Auto-scroll during typewriter animation
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const interval = setInterval(() => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 60;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [conversationMessages.length]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-medium text-gray-400">Live Transcript</h3>
        <StatusIndicator status={status} />
      </div>
      <div
        ref={scrollRef}
        className="flex flex-col gap-3 p-4 min-h-[120px] max-h-[400px] overflow-y-auto"
      >
        {conversationMessages.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">
            Transcript will appear here once the conversation begins...
          </p>
        ) : (
          conversationMessages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              isLatest={index === conversationMessages.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
