"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { Note } from "@/lib/types";
import { Button, Card, Textarea } from "./ui";

export function Notes({ subject }: { subject: Note["subject"] }) {
  const { notes, addNote, deleteNote } = useStore();
  const [text, setText] = useState("");
  const mine = notes.filter((n) => n.subject.kind === subject.kind && n.subject.id === subject.id);

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">הערות צוות</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addNote(subject, text.trim());
          setText("");
        }}
        className="space-y-2"
      >
        <Textarea maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="מה חשוב שהצוות ידע? (לא מוצג למארחים ולעדים)" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim()}>הוספת הערה</Button>
        </div>
      </form>
      <ol className="space-y-3">
        {mine.length === 0 && <li className="text-sm text-muted">אין הערות עדיין.</li>}
        {mine.map((n) => (
          <li key={n.id} className="group rounded-lg bg-cream/60 p-3">
            <p className="whitespace-pre-wrap">{n.text}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>{n.author} · {timeAgo(n.createdAt)}</span>
              <button
                aria-label="מחיקת הערה"
                className="opacity-0 transition-opacity hover:text-rose group-hover:opacity-100 focus:opacity-100"
                onClick={() => confirm("למחוק את ההערה?") && deleteNote(n.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
