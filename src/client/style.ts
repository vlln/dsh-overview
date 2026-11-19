export const OVERVIEW_STYLE_ID = 'dsh-overview-styles';

export const overviewStyle = `
.dsh-ov-anchor{position:relative;display:inline-flex;align-items:center}
.dsh-ov-trigger-btn{position:relative}
.dsh-ov-trigger-dot-wrap{position:absolute;top:4px;right:4px;display:inline-flex;pointer-events:none}
.dsh-ov-trigger-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.dsh-ov-trigger-dot-wrap[data-tone=attention] .dsh-ov-trigger-dot{background:var(--dsw-alias-state-warning-primary,#d97706)}
.dsh-ov-trigger-dot-wrap[data-tone=done] .dsh-ov-trigger-dot{background:var(--dsw-alias-state-success-primary,#16a34a)}

.dsh-ov-portal{
  --ov-surface:var(--dsw-alias-bg-layer-1);
  --ov-line:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);
  --ov-line-soft:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
  --ov-hover:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);
  --ov-text:var(--dsw-alias-label-primary);
  --ov-text-2:var(--dsw-alias-label-secondary);
  --ov-text-3:var(--dsw-alias-label-tertiary);
  font-family:var(--dsw-font-family);
}
.dsh-ov-card{
  width:296px;max-height:calc(100vh - 72px);display:flex;flex-direction:column;overflow:hidden;
  padding:0;border-radius:12px;
  border:1px solid var(--ov-line);
  background:var(--ov-surface);
  box-shadow:0 8px 28px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06);
  color:var(--ov-text);font-size:13px;line-height:1.45;
}
.dsh-ov-card.is-pinned{box-shadow:0 2px 10px rgba(0,0,0,.06)}
.dsh-ov-portal.is-gliding{
  transition:left .36s cubic-bezier(.22,1,.36,1),top .36s cubic-bezier(.22,1,.36,1),transform .36s cubic-bezier(.22,1,.36,1);
  will-change:left,top;
}
.dsh-ov-portal.is-gliding .dsh-ov-card{box-shadow:0 12px 32px rgba(0,0,0,.14)}
.dsh-ov-head{
  flex:0 0 auto;position:relative;z-index:2;
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 14px 8px;
  background:color-mix(in srgb,var(--ov-surface) 88%,transparent);
  backdrop-filter:blur(8px);
  border-bottom:1px solid var(--ov-line-soft);
}
.dsh-ov-head::after{
  content:"";position:absolute;left:0;right:0;top:100%;height:10px;pointer-events:none;
  background:linear-gradient(to bottom,color-mix(in srgb,var(--ov-surface) 82%,transparent),transparent);
}
.dsh-ov-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 0 8px}
.dsh-ov-title{font-size:13px;font-weight:600;color:var(--ov-text)}
.dsh-ov-pin-btn{
  display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
  border:0;border-radius:6px;background:transparent;color:var(--ov-text-3);cursor:pointer;
}
.dsh-ov-pin-btn:hover{background:var(--ov-hover);color:var(--ov-text)}
.dsh-ov-pin-btn[aria-pressed=true]{color:var(--dsw-alias-state-business-primary,#2f5fd0);background:var(--ov-hover)}
.dsh-ov-mode-btn{
  border:0;background:transparent;color:var(--ov-text-3);
  font:inherit;font-size:11px;padding:2px 6px;border-radius:6px;cursor:pointer;
}
.dsh-ov-mode-btn:hover{background:var(--ov-hover);color:var(--ov-text)}

.dsh-ov-actions{display:flex;flex-direction:column;gap:1px;padding:2px 6px 6px}
.dsh-ov-action{
  display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;
  border:0;border-radius:8px;background:transparent;color:var(--ov-text);
  font:inherit;font-size:13px;font-weight:400;text-align:left;cursor:pointer;
}
.dsh-ov-action:hover:not(:disabled){background:var(--ov-hover)}
.dsh-ov-action:disabled{opacity:.45;cursor:not-allowed}
.dsh-ov-action-icon{display:inline-flex;align-items:center;color:var(--ov-text-2);flex:none}
.dsh-ov-action-icon svg{width:16px;height:16px}
.dsh-ov-action-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ov-action-badge{
  font-size:11px;color:var(--ov-text-3);padding:1px 7px;border-radius:999px;
  background:var(--ov-hover);font-variant-numeric:tabular-nums;
}
.dsh-ov-chevron{display:inline-flex;align-items:center;color:var(--ov-text-3);flex:none}
.dsh-ov-chevron svg{width:13px;height:13px}

.dsh-ov-section{border-top:1px solid var(--ov-line-soft);padding:6px 0 2px}
.dsh-ov-section:first-of-type{border-top:1px solid var(--ov-line-soft)}
.dsh-ov-section-btn{
  display:flex;align-items:center;gap:7px;width:100%;padding:6px 14px;
  border:0;border-radius:0;background:transparent;color:var(--ov-text-3);
  font:inherit;font-size:12px;font-weight:500;text-align:left;cursor:pointer;
}
.dsh-ov-section-btn:hover{background:transparent;color:var(--ov-text)}
.dsh-ov-section-count{
  display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;
  padding:0 6px;border-radius:999px;background:var(--ov-hover);color:var(--ov-text-2);
  font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;
}
.dsh-ov-section-delta{font-size:11px;font-weight:500;font-variant-numeric:tabular-nums}
.dsh-ov-section-delta[data-sign=pos]{color:var(--dsw-alias-state-success-primary,#16a34a)}
.dsh-ov-section-delta[data-sign=neg]{color:var(--dsw-alias-state-error-primary,#dc2626)}
.dsh-ov-section-chevron{display:inline-flex;align-items:center;color:var(--ov-text-3);transition:transform 140ms ease-out}
.dsh-ov-section-btn[aria-expanded=true] .dsh-ov-section-chevron{transform:rotate(90deg)}
.dsh-ov-section-chevron svg{width:12px;height:12px}
.dsh-ov-section-body{padding:2px 6px 4px}

.dsh-ov-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
.dsh-ov-item-row{position:relative;display:flex;align-items:center;gap:2px;border-radius:8px}
.dsh-ov-item-row.is-clickable:hover{background:var(--ov-hover)}
.dsh-ov-item-btn{
  display:flex;align-items:center;gap:8px;flex:1;width:100%;min-width:0;height:32px;padding:0 10px;border:0;border-radius:8px;
  background:transparent;color:var(--ov-text);font:inherit;font-size:13px;text-align:left;cursor:pointer;
}
.dsh-ov-item-static{
  display:flex;align-items:center;gap:8px;flex:1;width:100%;min-width:0;min-height:28px;padding:4px 10px;
  color:var(--ov-text);font-size:12px;line-height:1.45;
}
.dsh-ov-item-row.is-muted .dsh-ov-item-btn,.dsh-ov-item-row.is-muted .dsh-ov-item-static{color:var(--ov-text-3)}
.dsh-ov-item-btn svg,.dsh-ov-item-static svg{width:16px;height:16px;flex:none}
.dsh-ov-item-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ov-item-act{
  display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-right:4px;
  border:0;border-radius:6px;background:transparent;color:var(--ov-text-3);cursor:pointer;flex:none;
  opacity:0;pointer-events:none;transition:opacity 120ms ease-out,background-color 120ms ease-out,color 120ms ease-out;
}
.dsh-ov-item-row:hover .dsh-ov-item-act,.dsh-ov-item-row:focus-within .dsh-ov-item-act{opacity:1;pointer-events:auto}
.dsh-ov-item-act:hover{background:var(--ov-line);color:var(--ov-text)}
.dsh-ov-item-act svg{width:14px;height:14px}

.dsh-ov-hover-card{
  width:380px;max-width:min(420px,46vw);max-height:320px;overflow:auto;
  padding:10px 12px;border-radius:12px;border:1px solid var(--ov-line);
  background:var(--ov-surface);box-shadow:0 8px 28px rgba(0,0,0,.14),0 1px 4px rgba(0,0,0,.06);
  color:var(--ov-text);font-size:12px;line-height:1.45;
}
.dsh-ov-hover-subagent{display:flex;align-items:flex-start;gap:10px;width:320px;padding:10px 14px}
.dsh-ov-hover-sub-main{flex:1;min-width:0}
.dsh-ov-hover-title{font-size:13px;font-weight:500;color:var(--ov-text);word-break:break-word}
.dsh-ov-hover-sub{font-size:12px;color:var(--ov-text-3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ov-hover-metrics{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none;font-size:11px;color:var(--ov-text-3);font-variant-numeric:tabular-nums}
.dsh-ov-hover-job{width:420px;padding:0;overflow:hidden;background:var(--ov-surface)}

.dsh-ov-term{
  border:1px solid var(--ov-line);border-radius:10px;background:var(--ov-surface);
  color:var(--ov-text);font-size:12px;overflow:hidden;
}
.dsh-ov-hover-job .dsh-ov-term{border:0;border-radius:0}
.dsh-ov-term-cmd-row{display:flex;align-items:flex-start;gap:8px;padding:10px 12px}
.dsh-ov-term-cmd{
  flex:1;min-width:0;margin:0;
  font-family:var(--dsw-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);
  font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;
}
.dsh-ov-term-cmd.is-collapsed{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dsh-ov-term-tools{display:inline-flex;align-items:center;gap:2px;flex:none}
.dsh-ov-term-btn{
  display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
  border:0;border-radius:6px;background:transparent;color:var(--ov-text-3);cursor:pointer;
}
.dsh-ov-term-btn:hover{background:var(--ov-hover);color:var(--ov-text)}
.dsh-ov-term-out{
  border-top:1px solid var(--ov-line-soft);padding:10px 12px;max-height:240px;overflow-y:auto;
  font-family:var(--dsw-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);
  font-size:12px;line-height:1.55;color:var(--ov-text-2);white-space:pre-wrap;word-break:break-word;
}
.dsh-ov-term-empty{color:var(--ov-text-3)}
.dsh-ov-tok-kw{color:#c0266a}
.dsh-ov-tok-str{color:#b45309}
.dsh-ov-tok-flag{color:#9a6700}
.dsh-ov-tok-var{color:#b45309}
.dsh-ov-tok-num{color:#7c3aed}

.dsh-ov-sidebar-job{
  --ov-surface:var(--dsw-alias-bg-layer-1);
  --ov-line:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);
  --ov-line-soft:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
  --ov-hover:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);
  --ov-text:var(--dsw-alias-label-primary);
  --ov-text-2:var(--dsw-alias-label-secondary);
  --ov-text-3:var(--dsw-alias-label-tertiary);
  padding:12px 16px;font-family:var(--dsw-font-family);color:var(--ov-text);
}
.dsh-ov-sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.dsh-ov-sidebar-title{font-size:13px;font-weight:500;color:var(--ov-text)}
.dsh-ov-sidebar-meta{font-size:12px;color:var(--ov-text-3)}

.dsh-ov-settings{display:flex;flex-direction:column;gap:2px;font-family:var(--dsw-font-family)}
.dsh-ov-setting-row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
}
.dsh-ov-setting-row:last-child{border-bottom:0}
.dsh-ov-setting-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsh-ov-setting-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-ov-setting-desc{font-size:12px;color:var(--dsw-alias-label-tertiary)}

.dsh-ov-todo-item{display:flex;align-items:flex-start;gap:8px;padding:5px 10px;font-size:12px;line-height:1.45;color:var(--ov-text)}
.dsh-ov-todo-item[data-status=completed]{color:var(--ov-text-3)}
.dsh-ov-todo-glyph{display:inline-flex;align-items:center;justify-content:center;width:16px;height:18px;flex:none}
.dsh-ov-todo-text{flex:1;min-width:0;overflow-wrap:anywhere}
`;
