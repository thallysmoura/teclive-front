"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

export function OtpInput({
  length = 6,
  onComplete,
}: {
  length?: number;
  onComplete?: (code: string) => void;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(index: number, digit: string) {
    const next = [...values];
    next[index] = digit;
    setValues(next);

    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      onComplete?.(next.join(""));
    }
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setValues(next);
    const lastIndex = Math.min(text.length, length) - 1;
    inputs.current[lastIndex]?.focus();
    if (next.every((d) => d !== "")) onComplete?.(next.join(""));
  }

  return (
    <div className="flex justify-center gap-2.5">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-12 w-11 rounded-[10px] border border-ds-border text-center text-lg font-bold text-ds-text outline-none transition-all duration-150 ease-out focus:border-ds-primary focus:shadow-[0_0_0_3px_rgba(0,141,255,0.16)]"
        />
      ))}
    </div>
  );
}
