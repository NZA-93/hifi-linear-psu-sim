import { useEffect, useState } from "react";
import { formatCommitted, parseNumberDraft, snapNumber } from "./numberInput";

interface Common {
  id: string;
  min?: number;
  max?: number;
  /** Default `any` so round values like 1 / 0.1 / 0.5 are not rejected by HTML5 step. */
  step?: string;
  placeholder?: string;
}

type Props = Common &
  (
    | { optional: true; value: number | null; onChange: (n: number | null) => void }
    | { optional?: false; value: number; onChange: (n: number) => void }
  );

/**
 * Controlled number input that keeps a string draft while focused so mid-edit
 * states (empty, trailing decimal) are not coerced to 0 / 1.001, then snaps
 * to a finite value on blur.
 */
export function NumberField(props: Props) {
  const { id, value, min, max, step = "any", placeholder, optional = false, onChange } = props;
  const committed = formatCommitted(value);
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatCommitted(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const snapped = snapNumber(raw, { min, max, optional, fallback: value });
    if (optional) {
      (onChange as (n: number | null) => void)(snapped);
    } else {
      (onChange as (n: number) => void)(snapped ?? min ?? 0);
    }
    setDraft(formatCommitted(snapped));
  };

  return (
    <input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={focused ? draft : committed}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const parsed = parseNumberDraft(raw);
        if (parsed === null) {
          if (optional && raw.trim() === "") (onChange as (n: number | null) => void)(null);
          return;
        }
        if (min !== undefined && parsed < min) return;
        if (max !== undefined && parsed > max) return;
        if (optional) (onChange as (n: number | null) => void)(parsed);
        else (onChange as (n: number) => void)(parsed);
      }}
      onBlur={(e) => {
        setFocused(false);
        commit(e.target.value);
      }}
    />
  );
}
