"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";

interface EditorComposerProps {
  onPost: (content: string) => void;
  placeholder?: string;
  submitLabel?: string;
}

export function EditorComposer({
  onPost,
  placeholder = "What's on your mind?",
  submitLabel = "Post",
}: EditorComposerProps) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsPosting(true);
    try {
      await onPost(content);
      setContent("");
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={isPosting}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={isPosting}>
          <Paperclip className="h-4 w-4 mr-2" />
          Attach
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isPosting}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
