import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'select';
  options?: { label: string; value: string }[];
  className?: string;
}

export default function InlineEdit({ value, onSave, type = 'text', options = [], className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') (inputRef.current as HTMLInputElement).select();
    }
  }, [editing, type]);

  function handleSave() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  }

  if (editing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={e => { setDraft(e.target.value); handleSave(); }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none w-full"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 -ml-1 transition-colors ${className || ''}`}
      title="点击编辑"
    >
      {value || <span className="text-gray-300">-</span>}
    </span>
  );
}
