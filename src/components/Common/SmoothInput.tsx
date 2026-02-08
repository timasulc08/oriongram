import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Box } from '@mui/material';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';

interface SmoothInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  multiline?: boolean;
  maxRows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

function measureCursorPosition(
  text: string,
  cursorPos: number,
  container: HTMLElement,
  measureSpan: HTMLSpanElement,
): { x: number; y: number; height: number } {
  const style = window.getComputedStyle(container);
  measureSpan.style.cssText = `
    position: absolute; visibility: hidden; white-space: pre-wrap;
    word-break: break-word; pointer-events: none;
    font-family: ${style.fontFamily}; font-size: ${style.fontSize};
    font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing};
    line-height: ${style.lineHeight}; padding: ${style.padding};
    width: ${container.offsetWidth}px; box-sizing: border-box;
    border: ${style.border}; overflow-wrap: break-word;
  `;

  const before = text.slice(0, cursorPos);
  const safeText = before.replace(/ /g, '\u00a0');
  measureSpan.textContent = safeText;

  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  measureSpan.appendChild(marker);

  document.body.appendChild(measureSpan);

  const markerRect = marker.getBoundingClientRect();
  const spanRect = measureSpan.getBoundingClientRect();

  const x = markerRect.left - spanRect.left;
  const y = markerRect.top - spanRect.top;
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;

  document.body.removeChild(measureSpan);

  return { x, y, height: lineHeight };
}

export const SmoothInput: React.FC<SmoothInputProps> = ({
  value, onChange, onKeyDown, placeholder = '', multiline = true,
  maxRows = 6, autoFocus = false, disabled = false,
}) => {
  const themeMode = useStore(s => s.themeMode);
  const t = m3[themeMode];

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(document.createElement('span'));
  const cursorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, height: 18 });
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!isFocused) return;
    const iv = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(iv);
  }, [isFocused]);

  const resetBlink = useCallback(() => {
    setCursorVisible(true);
  }, []);

  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;

    const selStart = textarea.selectionStart;
    const text = textarea.value;

    try {
      const pos = measureCursorPosition(text, selStart, textarea, measureRef.current);
      setCursorPos({ x: pos.x, y: pos.y, height: pos.height });
    } catch {}
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelect = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateCursorPosition);
      resetBlink();
    };

    textarea.addEventListener('select', handleSelect);
    textarea.addEventListener('click', handleSelect);
    textarea.addEventListener('keyup', handleSelect);
    textarea.addEventListener('input', handleSelect);

    return () => {
      textarea.removeEventListener('select', handleSelect);
      textarea.removeEventListener('click', handleSelect);
      textarea.removeEventListener('keyup', handleSelect);
      textarea.removeEventListener('input', handleSelect);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateCursorPosition, resetBlink]);

  useLayoutEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCursorPosition);
  }, [value, updateCursorPosition]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22;
    const maxHeight = lineHeight * maxRows;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxRows]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    resetBlink();
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    resetBlink();
    onKeyDown?.(e);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setCursorVisible(true);
    requestAnimationFrame(updateCursorPosition);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setCursorVisible(false);
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        rows={1}
        style={{
          width: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: t.onSurface,
          fontFamily: '"Inter", "Roboto", sans-serif',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          padding: '10px 16px',
          caretColor: 'transparent',
          boxSizing: 'border-box' as const,
          overflowWrap: 'break-word' as const,
          wordBreak: 'break-word' as const,
        }}
      />

      {isFocused && (
        <Box
          ref={cursorRef}
          sx={{
            position: 'absolute',
            pointerEvents: 'none',
            left: cursorPos.x + 'px',
            top: cursorPos.y + 'px',
            width: '2.2px',
            height: cursorPos.height * 0.85 + 'px',
            marginTop: cursorPos.height * 0.075 + 'px',
            backgroundColor: t.primary,
            borderRadius: '1px',
            opacity: cursorVisible ? 1 : 0,
            boxShadow: `0 0 4px ${t.primary}66`,
            transition: `left 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 80ms ease-out, opacity 80ms ease-in-out`,
          }}
        />
      )}

      {!value && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '10px 16px',
          color: t.onSurfaceVariant + (isFocused ? '44' : '88'),
          fontSize: '0.95rem',
          lineHeight: '1.5',
          pointerEvents: 'none',
          fontFamily: '"Inter", "Roboto", sans-serif',
        }}>
          {placeholder}
        </Box>
      )}
    </Box>
  );
};
