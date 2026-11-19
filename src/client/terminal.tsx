import React, { useState } from 'react';
import { IconCheckOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
  </svg>
);

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {collapsed ? (
      <path
        d="M5 6l3-3 3 3M5 10l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M5 3.5l3 3 3-3M5 12.5l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const SHELL_TOKEN_RE =
  /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|&&|\|\||[|;><&]|(?:^|\s)(?:source|export|echo|sleep|cd|ls|cat|rg|grep|cut|awk|sed|python3?|node|npm|pnpm|dsh|bash|sh|nohup)(?=\s|$)|--?[a-zA-Z0-9_-]+|[A-Za-z_][A-Za-z0-9_]*=|\b\d+(?:\.\d+)?\b)/g;

function highlightShellCommand(command: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let idx = 0;
  for (const m of command.matchAll(SHELL_TOKEN_RE)) {
    const start = m.index ?? 0;
    const tok = m[0];
    if (start > last) parts.push(command.slice(last, start));
    let cls = 'dsh-ov-tok-kw';
    if (tok.startsWith('"') || tok.startsWith("'")) cls = 'dsh-ov-tok-str';
    else if (tok.endsWith('=')) cls = 'dsh-ov-tok-var';
    else if (/^\s*-/.test(tok)) cls = 'dsh-ov-tok-flag';
    else if (/^\d/.test(tok)) cls = 'dsh-ov-tok-num';
    parts.push(
      <span key={idx++} className={cls}>
        {tok}
      </span>,
    );
    last = start + tok.length;
  }
  if (last < command.length) parts.push(command.slice(last));
  return parts;
}

export function OverviewTerminalView({
  command,
  output,
  defaultCollapsed = false,
  emptyLabel = 'Empty log',
}: {
  command: string;
  output: string;
  defaultCollapsed?: boolean;
  emptyLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void navigator.clipboard?.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="dsh-ov-term">
      <div className="dsh-ov-term-cmd-row">
        <pre className={`dsh-ov-term-cmd${collapsed ? ' is-collapsed' : ''}`}>
          {highlightShellCommand(command)}
        </pre>
        <div className="dsh-ov-term-tools">
          <button
            type="button"
            className="dsh-ov-term-btn"
            aria-label={copied ? 'Copied' : 'Copy command'}
            title={copied ? '已复制' : '复制命令'}
            onClick={onCopy}
          >
            {copied ? <IconCheckOutlineRegular size={14} /> : <CopyIcon />}
          </button>
          <button
            type="button"
            className="dsh-ov-term-btn"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!collapsed}
            title={collapsed ? '展开' : '收起'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="dsh-ov-term-out">
          {output ? output : <span className="dsh-ov-term-empty">{emptyLabel}</span>}
        </div>
      )}
    </div>
  );
}
