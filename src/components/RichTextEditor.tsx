"use client";

import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, RemoveFormatting } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize-html";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync value from prop to contentEditable container only if they differ
  // to avoid losing cursor focus during typing.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCmd = (command: string, arg: string = "") => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Intercept paste to sanitize foreign fonts, letter-spacing, and inline styles copied from websites
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");

    if (html) {
      const cleaned = sanitizeRichText(html);
      document.execCommand("insertHTML", false, cleaned);
    } else if (text) {
      document.execCommand("insertText", false, text);
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="w-full border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#B8944F]/30 focus-within:border-[#B8944F] transition-all">
      {/* Editor Toolbar */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 flex items-center space-x-1.5 flex-wrap z-10 relative">
        <button
          type="button"
          onClick={() => execCmd("bold")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCmd("italic")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCmd("underline")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-[1px] bg-zinc-300 mx-1" />
        <button
          type="button"
          onClick={() => execCmd("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCmd("insertOrderedList")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-[1px] bg-zinc-300 mx-1" />
        <button
          type="button"
          onClick={() => execCmd("removeFormat")}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Clear Format"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="rich-text-editor-area px-4 py-3 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none"
        style={{ outline: "none" }}
      />
    </div>
  );
}
