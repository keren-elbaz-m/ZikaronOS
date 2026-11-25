"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button, Card } from "./ui";

type Errors = Record<string, string>;

/**
 * A card with a read view and an edit form for the same record slice.
 * Saving runs `validate` first and only leaves edit mode when the save succeeds;
 * cancelling asks before discarding unsaved changes.
 */
export function EditableSection<T extends object>({
  title, value, view, edit, validate, onSave, action,
}: {
  title: string;
  value: T;
  view: (v: T) => React.ReactNode;
  edit: (draft: T, set: <K extends keyof T>(k: K, v: T[K]) => void, errors: Errors) => React.ReactNode;
  validate?: (draft: T) => Errors;
  onSave: (draft: T) => string | void; // return an error message to stay in edit mode
  action?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<T | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(value);

  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((d) => ({ ...(d ?? value), [k]: v }));

  const save = () => {
    if (!draft) return;
    const e = validate?.(draft) ?? {};
    setErrors(e);
    if (Object.keys(e).length) return;
    const failure = onSave(draft);
    if (failure) {
      toast.error(failure);
      return;
    }
    setDraft(null);
    toast.success(`${title} נשמר`);
  };

  const cancel = () => {
    if (dirty && !confirm("יש שינויים שלא נשמרו. לבטל אותם?")) return;
    setDraft(null);
    setErrors({});
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {draft === null ? (
          <div className="flex items-center gap-2">
            {action}
            <Button variant="ghost" size="sm" onClick={() => setDraft(value)} aria-label={`עריכת ${title}`}>
              <Pencil className="size-4" />עריכה
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>ביטול</Button>
            <Button size="sm" onClick={save} disabled={!dirty}>שמירה</Button>
          </div>
        )}
      </div>
      {draft === null ? view(value) : edit(draft, set, errors)}
    </Card>
  );
}

export function Dl({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-muted">{k}</dt>
          <dd className="mt-0.5 break-words">{v === undefined || v === null || v === "" ? <span className="text-muted">—</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CheckGroup<V extends string>({ options, value, onChange }: { options: Record<V, string>; value: V[]; onChange: (v: V[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {(Object.keys(options) as V[]).map((k) => (
        <label key={k} className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-ink" checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} />
          {options[k]}
        </label>
      ))}
    </div>
  );
}
