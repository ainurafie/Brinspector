// Parsing helpers for JavaScript exceptions (spec F-004). Pure functions — see tests/unit/stack.test.js.
import { redactText } from './redact.js';

/** "TypeError: Cannot read properties of undefined" → { type, message }. */
export function parseErrorHeadline(text = '') {
  const firstLine = String(text).split('\n')[0].trim();
  const match = firstLine.match(/^(?:Uncaught\s+)?([A-Z]\w*(?:Error|Exception)|Error)\s*:\s*(.*)$/);
  if (match) return { type: match[1], message: match[2] };
  return { type: 'Error', message: firstLine };
}

/** "https://app.example/static/js/app.chunk.js?v=3" → "static/js/app.chunk.js". */
export function shortFileName(url = '') {
  const text = String(url);
  try {
    const parsed = new URL(text);
    return parsed.pathname.replace(/^\/+/, '') || parsed.host;
  } catch {
    return text.replace(/[?#].*$/, '');
  }
}

// Chrome/V8:   "    at fn (https://x/app.js:142:19)"  or  "    at https://x/app.js:142:19"
const V8_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/;
// Firefox/Safari: "fn@https://x/app.js:142:19"
const GECKO_FRAME = /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/;

/**
 * Parse a stack string into frames: [{ fn, file, url, line, column }].
 * Lines that are not frames (the headline, "<anonymous>" noise) are skipped.
 */
export function parseStack(stack = '') {
  return String(stack)
    .split('\n')
    .map((line) => {
      const match = line.match(V8_FRAME) || line.match(GECKO_FRAME);
      if (!match) return null;
      const [, fn, url, lineNo, column] = match;
      return {
        fn: fn && fn.trim() ? fn.trim() : '<anonymous>',
        url,
        file: shortFileName(url),
        line: Number(lineNo),
        column: Number(column),
      };
    })
    .filter(Boolean);
}

/**
 * Lines around the failing line, for the code-frame snippet.
 * @returns {{ file, line, lines: Array<{ number, text, isError }> } | null}
 */
export function buildCodeFrame(source, { file = '', line, context = 2 } = {}) {
  if (typeof source !== 'string' || !Number.isInteger(line) || line < 1) return null;
  const all = source.split('\n');
  if (line > all.length) return null;
  const start = Math.max(1, line - context);
  const end = Math.min(all.length, line + context);
  const lines = [];
  for (let number = start; number <= end; number += 1) {
    lines.push({ number, text: all[number - 1], isError: number === line });
  }
  return { file, line, lines };
}

/**
 * Normalise a captured exception ({ message, stack, source? }) into what StackTraceViewer renders.
 * Message and stack are redacted because they can contain tokens or user data.
 */
export function toExceptionView({ message = '', stack = '', source = null, sourceMapped } = {}) {
  const headline = parseErrorHeadline(redactText(message || stack));
  const frames = parseStack(redactText(stack));
  const top = frames[0];
  const codeFrame = top && source ? buildCodeFrame(source, { file: top.file, line: top.line }) : null;
  return {
    type: headline.type,
    message: headline.message,
    frames,
    codeFrame,
    sourceMapped,
  };
}
