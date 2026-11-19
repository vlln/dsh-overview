window.__ModuleLoader__.load({
	id: "@vlln/dsh-overview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperties(exports, {
			__esModule: { value: true },
			[Symbol.toStringTag]: { value: "Module" }
		});
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/registry.ts
		const DEFAULT_PREFS = {
			displayMode: "popover",
			enableTodos: true,
			enableSubagents: true,
			enableJobs: true,
			enableInputs: true,
			enablePresentBookmarks: true,
			enableDelta: true
		};
		const sortByOrder = (items) => [...items].sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
		var OverviewRegistry = class {
			actions = /* @__PURE__ */ new Map();
			sections = /* @__PURE__ */ new Map();
			badges = /* @__PURE__ */ new Map();
			sessionTodos = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			prefs = { ...DEFAULT_PREFS };
			version = 0;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			getVersion = () => this.version;
			getPreferences = () => this.prefs;
			setPreferences(patch) {
				this.prefs = {
					...this.prefs,
					...patch
				};
				this.emit();
			}
			emit() {
				this.version += 1;
				for (const listener of this.listeners) listener();
			}
			registerAction(spec) {
				this.actions.set(spec.id, spec);
				this.emit();
				return () => {
					if (this.actions.get(spec.id) === spec) {
						this.actions.delete(spec.id);
						this.emit();
					}
				};
			}
			registerSection(spec) {
				this.sections.set(spec.id, spec);
				this.emit();
				return () => {
					if (this.sections.get(spec.id) === spec) {
						this.sections.delete(spec.id);
						this.emit();
					}
				};
			}
			registerBadge(spec) {
				this.badges.set(spec.id, spec);
				this.emit();
				return () => {
					if (this.badges.get(spec.id) === spec) {
						this.badges.delete(spec.id);
						this.emit();
					}
				};
			}
			getActions(sessionId) {
				return sortByOrder([...this.actions.values()].filter((item) => !item.visible || item.visible(sessionId)));
			}
			getSections(sessionId) {
				return sortByOrder([...this.sections.values()].filter((item) => !item.visible || item.visible(sessionId)));
			}
			getActiveBadge(sessionId) {
				const top = [...this.badges.values()].filter((item) => !item.visible || item.visible(sessionId)).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))[0];
				if (!top) return null;
				const text = typeof top.text === "function" ? top.text(sessionId) : top.text;
				return {
					tone: top.tone ?? "neutral",
					text
				};
			}
			setSessionTodos(sessionId, todos) {
				const prev = this.sessionTodos.get(sessionId) ?? [];
				if (prev.length === todos.length && prev.every((item, i) => item.content === todos[i]?.content && item.status === todos[i]?.status)) return;
				this.sessionTodos.set(sessionId, [...todos]);
				this.emit();
			}
			getSessionTodos(sessionId) {
				return this.sessionTodos.get(sessionId) ?? [];
			}
		};
		//#endregion
		//#region src/client/scanners.ts
		function readCachedItems(storageKey) {
			try {
				if (typeof localStorage === "undefined") return [];
				const raw = localStorage.getItem(storageKey);
				const parsed = raw ? JSON.parse(raw) : [];
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}
		function writeCachedItems(storageKey, items) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(storageKey, JSON.stringify(items));
			} catch {}
		}
		function normalizePresentedPath(p) {
			return p.trim().replace(/^\.\//, "").replace(/\/+/g, "/");
		}
		function isSamePresentedPath(a, b) {
			const na = normalizePresentedPath(a);
			const nb = normalizePresentedPath(b);
			if (!na || !nb) return false;
			if (na === nb) return true;
			if (na.startsWith("/") && !nb.startsWith("/") && na.endsWith(`/${nb}`)) return true;
			if (nb.startsWith("/") && !na.startsWith("/") && nb.endsWith(`/${na}`)) return true;
			return false;
		}
		function scanPresentBookmarks(pane) {
			if (!pane || typeof document === "undefined") return [];
			const found = [];
			const hasPath = (candidate) => found.some((item) => isSamePresentedPath(item.path || item.label, candidate));
			pane.querySelectorAll("[data-presented-file]").forEach((card, idx) => {
				const previewBtn = card.querySelector("button[aria-label], [role=\"button\"][aria-label]");
				const fullPath = previewBtn?.getAttribute("title")?.trim() ?? "";
				const spans = [...card.querySelectorAll("span")].map((s) => (s.textContent || "").trim()).filter(Boolean);
				const fileName = (fullPath ? fullPath.split("/").filter(Boolean).pop() : "") || spans[0] || `#${idx + 1}`;
				const dedupKey = fullPath || fileName;
				if (hasPath(dedupKey)) return;
				found.push({
					key: `pf:${idx}:${dedupKey}`,
					label: fileName.slice(0, 64),
					path: fullPath || fileName,
					element: card,
					previewButton: previewBtn
				});
			});
			pane.querySelectorAll("[data-tool-name=\"present\"], [data-tool=\"present\"]").forEach((el, idx) => {
				const rawPaths = [...el.querySelectorAll("span")].reverse().find((s) => {
					const txt = (s.textContent || "").trim();
					return txt.length > 0 && (txt.includes("/") || /\.[a-z0-9]{1,8}$/i.test(txt));
				})?.textContent?.trim() ?? "";
				(rawPaths ? rawPaths.split(",").map((p) => p.trim()).filter(Boolean) : [(el.getAttribute("aria-label") || `#${idx + 1}`).trim()]).forEach((p, subIdx) => {
					if (hasPath(p)) return;
					const fileName = p.split("/").filter(Boolean).pop() ?? p;
					found.push({
						key: `pt:${idx}:${subIdx}:${p}`,
						label: fileName.slice(0, 64),
						path: p,
						element: el
					});
				});
			});
			return found;
		}
		function scanInputMaterials(pane) {
			if (!pane || typeof document === "undefined") return [];
			const found = [];
			const seen = /* @__PURE__ */ new Set();
			pane.querySelectorAll("[data-message-attachments] span[title], [data-message-attachments] button[title], [data-message-attachments] a[title]").forEach((el, idx) => {
				const name = (el.getAttribute("title") || el.textContent || "").trim();
				if (!name || seen.has(name)) return;
				seen.add(name);
				found.push({
					key: `in:${idx}:${name}`,
					label: name,
					element: el
				});
			});
			return found;
		}
		function openPresentBookmark(bm, sessionId, sidebarRight) {
			if (bm.previewButton) {
				bm.previewButton.click();
				return;
			}
			if (bm.element) {
				const previewBtn = [...(bm.element.closest("article, [data-message-id], [data-turn-id]") ?? document.body).querySelectorAll("button[aria-label], [role=\"button\"][aria-label]")].find((btn) => {
					const label = btn.getAttribute("aria-label") ?? "";
					return bm.path && label.includes(bm.path) || label.includes(bm.label);
				});
				if (previewBtn) {
					previewBtn.click();
					return;
				}
				bm.element.scrollIntoView({
					behavior: "smooth",
					block: "center"
				});
				return;
			}
			if (bm.path.startsWith("/") && sidebarRight?.openResource) sidebarRight.openResource(`dsh-resource://file/session/${encodeURIComponent(sessionId)}${bm.path}`);
		}
		function findConversationPane(anchor) {
			if (!anchor) return null;
			let header = anchor.closest("header") ?? anchor.parentElement;
			while (header && header !== document.body && header.clientWidth < 360) header = header.parentElement;
			return header?.closest("section, main") ?? header?.parentElement?.parentElement ?? header?.parentElement ?? null;
		}
		//#endregion
		//#region src/client/style.ts
		const OVERVIEW_STYLE_ID = "dsh-overview-styles";
		const overviewStyle = `
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
.dsh-ov-title{font-size:12px;font-weight:500;color:var(--ov-text-3)}
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
		//#endregion
		//#region src/client/terminal.tsx
		const CopyIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "5.5",
				y: "5.5",
				width: "8",
				height: "8",
				rx: "1.5",
				stroke: "currentColor",
				strokeWidth: "1.3"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5",
				stroke: "currentColor",
				strokeWidth: "1.3"
			})]
		});
		const CollapseIcon = ({ collapsed }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": "true",
			children: collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M5 6l3-3 3 3M5 10l3 3 3-3",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M5 3.5l3 3 3-3M5 12.5l3-3 3 3",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})
		});
		const SHELL_TOKEN_RE = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|&&|\|\||[|;><&]|(?:^|\s)(?:source|export|echo|sleep|cd|ls|cat|rg|grep|cut|awk|sed|python3?|node|npm|pnpm|dsh|bash|sh|nohup)(?=\s|$)|--?[a-zA-Z0-9_-]+|[A-Za-z_][A-Za-z0-9_]*=|\b\d+(?:\.\d+)?\b)/g;
		function highlightShellCommand(command) {
			const parts = [];
			let last = 0;
			let idx = 0;
			for (const m of command.matchAll(SHELL_TOKEN_RE)) {
				const start = m.index ?? 0;
				const tok = m[0];
				if (start > last) parts.push(command.slice(last, start));
				let cls = "dsh-ov-tok-kw";
				if (tok.startsWith("\"") || tok.startsWith("'")) cls = "dsh-ov-tok-str";
				else if (tok.endsWith("=")) cls = "dsh-ov-tok-var";
				else if (/^\s*-/.test(tok)) cls = "dsh-ov-tok-flag";
				else if (/^\d/.test(tok)) cls = "dsh-ov-tok-num";
				parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: cls,
					children: tok
				}, idx++));
				last = start + tok.length;
			}
			if (last < command.length) parts.push(command.slice(last));
			return parts;
		}
		function OverviewTerminalView({ command, output, defaultCollapsed = false, emptyLabel = "Empty log" }) {
			const [collapsed, setCollapsed] = (0, react.useState)(defaultCollapsed);
			const [copied, setCopied] = (0, react.useState)(false);
			const onCopy = () => {
				navigator.clipboard?.writeText(command);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ov-term",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ov-term-cmd-row",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: `dsh-ov-term-cmd${collapsed ? " is-collapsed" : ""}`,
						children: highlightShellCommand(command)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ov-term-tools",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ov-term-btn",
							"aria-label": copied ? "Copied" : "Copy command",
							title: copied ? "已复制" : "复制命令",
							onClick: onCopy,
							children: copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyIcon, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ov-term-btn",
							"aria-label": collapsed ? "Expand" : "Collapse",
							"aria-expanded": !collapsed,
							title: collapsed ? "展开" : "收起",
							onClick: () => setCollapsed((v) => !v),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapseIcon, { collapsed })
						})]
					})]
				}), !collapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ov-term-out",
					children: output ? output : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ov-term-empty",
						children: emptyLabel
					})
				})]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const todoDotState = (status) => status === "completed" ? "done" : status === "in_progress" ? "ongoing" : "idle";
		const PinIcon = ({ pinned }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M9.8 2.4l3.8 3.8-1.1 1.1-1-.3-2.4 2.4.5 2.5-1 1-2.5-2.5-3.2 3.2-.7-.7 3.2-3.2L3 7.2l1-1 2.5.5 2.4-2.4-.3-1 1.2-.9z",
				stroke: "currentColor",
				strokeWidth: "1.2",
				strokeLinejoin: "round",
				fill: pinned ? "currentColor" : "none"
			})
		});
		function formatCompactTokens(usage) {
			if (!usage || typeof usage !== "object") return "";
			const total = Number(usage.total_tokens ?? usage.totalTokens ?? 0) || Number(usage.input_tokens ?? usage.inputTokens ?? 0) + Number(usage.output_tokens ?? usage.outputTokens ?? 0) + Number(usage.cache_read_input_tokens ?? usage.cachedInputTokens ?? 0);
			if (!Number.isFinite(total) || total <= 0) return "";
			if (total < 1e3) return `${total} tok`;
			if (total < 1e6) return `${(total / 1e3).toFixed(1).replace(/\.0$/, "")}K tok`;
			return `${(total / 1e6).toFixed(1).replace(/\.0$/, "")}M tok`;
		}
		function formatDurationMs(ms) {
			if (!Number.isFinite(ms) || ms <= 0) return "";
			const sec = Math.max(1, Math.round(ms / 1e3));
			if (sec < 60) return `${sec}秒`;
			const min = Math.floor(sec / 60);
			const rem = sec % 60;
			return rem ? `${min}分${rem}秒` : `${min}分`;
		}
		function subagentDurationMs(summary, activity) {
			const timing = summary?.projectionValues?.subagentTiming;
			if (timing && typeof timing === "object") {
				const settled = Number(timing.settledMs ?? 0);
				if (!timing.active) return settled;
				const end = activity === "running" ? Date.now() : Number(timing.active.through ?? Date.now());
				return settled + Math.max(0, end - Number(timing.active.since ?? end));
			}
			if (summary?.updatedAt && summary?.createdAt) return Math.max(0, Number(summary.updatedAt) - Number(summary.createdAt));
			return 0;
		}
		const NS = "dsh-overview";
		function ensureStyle() {
			if (typeof document === "undefined") return () => {};
			let el = document.getElementById(OVERVIEW_STYLE_ID);
			if (!el) {
				el = document.createElement("style");
				el.id = OVERVIEW_STYLE_ID;
				el.textContent = overviewStyle;
				document.head.appendChild(el);
			}
			return () => {
				el?.remove();
			};
		}
		function OverviewItem({ icon, label, muted, onClick, onMouseEnter, onMouseLeave, action }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: `dsh-ov-item-row${onClick ? " is-clickable" : ""}${muted ? " is-muted" : ""}`,
				onMouseEnter,
				onMouseLeave,
				children: [onClick ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-ov-item-btn",
					onClick,
					children: [icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ov-todo-glyph",
						"aria-hidden": "true",
						children: icon
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ov-item-text",
						children: label
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ov-item-static",
					children: [icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ov-todo-glyph",
						"aria-hidden": "true",
						children: icon
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ov-todo-text",
						children: label
					})]
				}), action ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-ov-item-act",
					"aria-label": action.label,
					title: action.title ?? action.label,
					onClick: (e) => {
						e.stopPropagation();
						action.onClick();
					},
					children: action.icon
				}) : null]
			});
		}
		function bridgeSlotExtensions(ctx, registry) {
			if (!ctx?.slots?.entries || !ctx?.slots?.subscribe) return () => {};
			const actionOffs = /* @__PURE__ */ new Map();
			const sectionOffs = /* @__PURE__ */ new Map();
			const badgeOffs = /* @__PURE__ */ new Map();
			const sync = () => {
				const seenActions = /* @__PURE__ */ new Set();
				for (const entry of ctx.slots.entries("overview.action") ?? []) {
					const opts = entry?.options ?? {};
					const id = String(opts.id ?? "");
					if (!id) continue;
					seenActions.add(id);
					if (!actionOffs.has(id) && typeof opts.onClick === "function") actionOffs.set(id, registry.registerAction({
						id: `slot:${id}`,
						order: typeof opts.order === "number" ? opts.order : 100,
						label: String(opts.label ?? id),
						icon: opts.icon,
						badge: opts.badge,
						disabled: Boolean(opts.disabled),
						visible: typeof opts.visible === "function" ? opts.visible : void 0,
						onClick: opts.onClick
					}));
				}
				for (const [id, off] of actionOffs) if (!seenActions.has(id)) {
					off();
					actionOffs.delete(id);
				}
				const seenSections = /* @__PURE__ */ new Set();
				for (const entry of ctx.slots.entries("overview.section") ?? []) {
					const opts = entry?.options ?? {};
					const id = String(opts.id ?? "");
					if (!id) continue;
					seenSections.add(id);
					if (!sectionOffs.has(id)) sectionOffs.set(id, registry.registerSection({
						id: `slot:${id}`,
						order: typeof opts.order === "number" ? opts.order : 100,
						title: String(opts.title ?? id),
						badge: opts.badge,
						trackDelta: Boolean(opts.trackDelta),
						defaultOpen: opts.defaultOpen !== false,
						visible: typeof opts.visible === "function" ? opts.visible : void 0,
						render: (sessionId) => typeof opts.render === "function" ? opts.render(sessionId) : null
					}));
				}
				for (const [id, off] of sectionOffs) if (!seenSections.has(id)) {
					off();
					sectionOffs.delete(id);
				}
				const seenBadges = /* @__PURE__ */ new Set();
				for (const entry of ctx.slots.entries("overview.trigger.badge") ?? []) {
					const opts = entry?.options ?? {};
					const id = String(opts.id ?? "");
					if (!id) continue;
					seenBadges.add(id);
					if (!badgeOffs.has(id)) badgeOffs.set(id, registry.registerBadge({
						id: `slot:${id}`,
						priority: typeof opts.priority === "number" ? opts.priority : 0,
						tone: opts.tone ?? "neutral",
						text: opts.text,
						visible: typeof opts.visible === "function" ? opts.visible : void 0
					}));
				}
				for (const [id, off] of badgeOffs) if (!seenBadges.has(id)) {
					off();
					badgeOffs.delete(id);
				}
			};
			const off1 = ctx.slots.subscribe("overview.action", sync);
			const off2 = ctx.slots.subscribe("overview.section", sync);
			const off3 = ctx.slots.subscribe("overview.trigger.badge", sync);
			sync();
			return () => {
				off1?.();
				off2?.();
				off3?.();
				for (const off of actionOffs.values()) off();
				for (const off of sectionOffs.values()) off();
				for (const off of badgeOffs.values()) off();
			};
		}
		function apply(ctx) {
			const registry = new OverviewRegistry();
			ctx.provide?.("overview", registry);
			ctx.effect(() => ensureStyle(), "dsh-overview: styles");
			ctx.effect(() => bridgeSlotExtensions(ctx, registry), "dsh-overview: slot bridge");
			ctx.effect(() => ctx.locale.register(NS, {
				en: {
					trigger: "Overview",
					title: "Overview",
					presentTitle: "Deliverables",
					inputsTitle: "Inputs",
					todosTitle: "To-dos",
					subagentsTitle: "Subagents",
					jobsTitle: "Background Tasks",
					jobTabTitle: "Background Task",
					modePopover: "Popover",
					modeAutoDock: "Auto-dock"
				},
				zh: {
					trigger: "总览",
					title: "会话总览",
					presentTitle: "关键产出",
					inputsTitle: "输入材料",
					todosTitle: "待办",
					subagentsTitle: "子智能体",
					jobsTitle: "后台任务",
					jobTabTitle: "后台任务",
					modePopover: "仅点击弹出",
					modeAutoDock: "宽屏停靠"
				}
			}), "dsh-overview: locale");
			const sessionsRef = { current: null };
			const workspaceRef = { current: null };
			const jobsRef = { current: null };
			const sidebarRightRef = { current: null };
			let serviceVersion = 0;
			const serviceListeners = /* @__PURE__ */ new Set();
			const bumpServiceVersion = () => {
				serviceVersion += 1;
				for (const l of serviceListeners) l();
			};
			const subscribeServices = (l) => {
				serviceListeners.add(l);
				return () => {
					serviceListeners.delete(l);
				};
			};
			const getServiceVersion = () => serviceVersion;
			const JOB_TAB_ID = "@vlln/dsh-overview/job";
			const JOB_TAB_KIND = "overview-job";
			let activeJobPreview = null;
			const jobPreviewListeners = /* @__PURE__ */ new Set();
			const setActiveJobPreview = (next) => {
				activeJobPreview = next;
				for (const l of jobPreviewListeners) l();
			};
			const tPlugin = ctx.locale.bind(NS);
			function SidebarJobPreview() {
				const [, setTick] = (0, react.useState)(0);
				(0, react.useEffect)(() => {
					const l = () => setTick((n) => n + 1);
					jobPreviewListeners.add(l);
					return () => {
						jobPreviewListeners.delete(l);
					};
				}, []);
				const current = activeJobPreview;
				const [observed, setObserved] = (0, react.useState)(null);
				(0, react.useEffect)(() => {
					if (!current) return;
					const jobsSvc = jobsRef.current;
					if (!jobsSvc?.state) return;
					const unobserve = jobsSvc.observe?.(current.sessionId, current.job.id);
					const sync = () => {
						const snap = jobsSvc.state.getSnapshot();
						setObserved(snap?.observed?.[String(current.job.id)] ?? null);
					};
					sync();
					const off = jobsSvc.state.subscribe?.(sync);
					return () => {
						off?.();
						unobserve?.();
					};
				}, [current?.sessionId, current?.job?.id]);
				if (!current) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ov-sidebar-job",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ov-sidebar-meta",
						children: "No task selected."
					})
				});
				const job = current.job;
				const label = String(job.label || job.command || job.title || job.id);
				const rawDetail = job.progress ?? job.detail;
				const detailText = typeof rawDetail === "string" || typeof rawDetail === "number" ? String(rawDetail) : "";
				const meta = [
					job.kind,
					job.status,
					detailText
				].filter(Boolean).join(" · ");
				const tail = observed?.text ?? observed?.output?.tail ?? observed?.tail ?? "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ov-sidebar-job",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ov-sidebar-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ov-sidebar-title",
							children: tPlugin("jobTabTitle") || "Background Task"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ov-sidebar-meta",
							children: meta
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewTerminalView, {
						command: label,
						output: tail
					})]
				});
			}
			ctx.inject?.(["sessions"], (scope) => {
				sessionsRef.current = scope.sessions;
				bumpServiceVersion();
				return () => {
					sessionsRef.current = null;
					bumpServiceVersion();
				};
			});
			ctx.inject?.(["uiWorkspace"], (scope) => {
				workspaceRef.current = scope.uiWorkspace;
				bumpServiceVersion();
				return () => {
					workspaceRef.current = null;
					bumpServiceVersion();
				};
			});
			ctx.inject?.(["jobs"], (scope) => {
				jobsRef.current = scope.jobs;
				bumpServiceVersion();
				return () => {
					jobsRef.current = null;
					bumpServiceVersion();
				};
			});
			ctx.inject?.(["sidebarRight", "sidebarRightTabs"], (scope) => {
				sidebarRightRef.current = scope.sidebarRight;
				bumpServiceVersion();
				const offTab = scope.sidebarRightTabs?.register?.({
					id: JOB_TAB_ID,
					kind: JOB_TAB_KIND,
					title: () => tPlugin("jobTabTitle") || "Background Task",
					closable: true
				});
				const offSlot = ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: JOB_TAB_ID,
					locale: NS
				}, SidebarJobPreview));
				return () => {
					sidebarRightRef.current = null;
					offSlot?.();
					offTab?.();
				};
			});
			const PREFS_STORAGE_KEY = "dsh-overview:v1:prefs";
			try {
				if (typeof window !== "undefined") {
					const saved = window.localStorage.getItem(PREFS_STORAGE_KEY);
					if (saved) registry.setPreferences(JSON.parse(saved));
				}
			} catch {}
			let formScopeRef = null;
			const formListeners = /* @__PURE__ */ new Set();
			const notifyFormListeners = () => {
				for (const fn of formListeners) fn();
			};
			ctx.inject?.(["configForms"], (scope) => {
				const formScope = scope.configForms?.get?.(NS);
				if (!formScope) return () => {};
				formScopeRef = formScope;
				const syncPrefs = () => {
					const snap = formScope.getSnapshot?.();
					if (snap?.status === "ready" && snap.value && typeof snap.value === "object") registry.setPreferences(snap.value);
					notifyFormListeners();
				};
				syncPrefs();
				const offSub = formScope.subscribe?.(syncPrefs);
				return () => {
					offSub?.();
					if (formScopeRef === formScope) formScopeRef = null;
					notifyFormListeners();
				};
			});
			const SETTING_ITEMS = [
				{
					key: "enableTodos",
					zh: "待办（To-dos）",
					zhDesc: "在总览中同步会话待办清单与完成进度",
					en: "To-dos",
					enDesc: "Show session to-do progress in Overview"
				},
				{
					key: "enableSubagents",
					zh: "子智能体（Subagents）",
					zhDesc: "列出当前会话子智能体并支持 Hover 详情与右侧栏打开",
					en: "Subagents",
					enDesc: "List session subagents with hover summary and sidebar preview"
				},
				{
					key: "enableJobs",
					zh: "后台任务（Background Tasks）",
					zhDesc: "列出后台任务并支持终端预览、停止/移除与右侧栏输出",
					en: "Background Tasks",
					enDesc: "List background tasks with terminal hover preview and controls"
				},
				{
					key: "enableInputs",
					zh: "输入材料（Inputs）",
					zhDesc: "汇总用户上传到会话中的文件",
					en: "Inputs",
					enDesc: "Collect user-uploaded input files in this session"
				},
				{
					key: "enablePresentBookmarks",
					zh: "关键产出（Deliverables）",
					zhDesc: "汇总 present 工具交付的文件并支持直接预览",
					en: "Deliverables",
					enDesc: "Collect presented deliverable files for quick preview"
				},
				{
					key: "enableDelta",
					zh: "增量变化标记（+x / -x）",
					zhDesc: "在列表计数旁显示相对上次打开总览的变化量",
					en: "Delta indicators (+x / -x)",
					enDesc: "Show count changes since Overview was last opened"
				}
			];
			function OverviewSettingsCard({ t }) {
				(0, react.useSyncExternalStore)((fn) => registry.subscribe(fn), () => registry.getVersion());
				(0, react.useSyncExternalStore)((fn) => {
					formListeners.add(fn);
					return () => formListeners.delete(fn);
				}, () => formScopeRef?.getSnapshot?.());
				const isEn = t?.("trigger") === "Overview";
				const snap = formScopeRef?.getSnapshot?.();
				const val = registry.getPreferences();
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ov-settings",
					children: SETTING_ITEMS.map((item) => {
						const checked = Boolean(val[item.key]);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ov-setting-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ov-setting-info",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ov-setting-label",
									children: isEn ? item.en : item.zh
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ov-setting-desc",
									children: isEn ? item.enDesc : item.zhDesc
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
								checked,
								onCheckedChange: (next) => {
									registry.setPreferences({ [item.key]: next });
									try {
										window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(registry.getPreferences()));
									} catch {}
									if (snap?.status === "ready" && snap?.writable !== false && snap?.revision !== void 0) formScopeRef?.set?.(item.key, next, snap.revision);
								}
							})]
						}, item.key);
					})
				});
			}
			const slots = ctx.get("slots");
			slots.inject("plugins.bundle.config", () => slots.register({
				name: "plugins.bundle.config",
				key: "@vlln/dsh-overview",
				locale: NS
			}, OverviewSettingsCard));
			function OverviewSectionBox({ section, sessionId, renderSlot, openState, onToggleOpen, delta, onHeaderEnter }) {
				const [localOpen, setLocalOpen] = (0, react.useState)(section.defaultOpen !== false);
				const open = openState !== void 0 ? openState : localOpen;
				const toggle = () => {
					const next = !open;
					if (onToggleOpen) onToggleOpen(next);
					else setLocalOpen(next);
				};
				const badgeValue = typeof section.badge === "function" ? section.badge(sessionId) : section.badge;
				const isSlot = section.id.startsWith("slot:");
				const slotId = isSlot ? section.id.slice(5) : "";
				const body = isSlot && renderSlot ? section.render(sessionId) ?? renderSlot("overview.section", { sessionId }, { only: slotId }) : section.render(sessionId);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ov-section",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-ov-section-btn",
						"aria-expanded": open,
						onMouseEnter: onHeaderEnter,
						onClick: toggle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section.title }),
							badgeValue !== void 0 && badgeValue !== null && badgeValue !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ov-section-count",
								children: badgeValue
							}),
							delta !== void 0 && delta !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ov-section-delta",
								"data-sign": delta > 0 ? "pos" : "neg",
								children: delta > 0 ? `+${delta}` : String(delta)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ov-section-chevron",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {})
							})
						]
					}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ov-section-body",
						children: body
					})]
				});
			}
			function OverviewTrigger({ sessionId, t, renderSlot }) {
				(0, react.useSyncExternalStore)(registry.subscribe, registry.getVersion);
				const svcVer = (0, react.useSyncExternalStore)(subscribeServices, getServiceVersion);
				const anchorRef = (0, react.useRef)(null);
				const cardRef = (0, react.useRef)(null);
				const hoverCloseTimer = (0, react.useRef)(null);
				const cancelHoverClose = () => {
					if (hoverCloseTimer.current !== null) {
						clearTimeout(hoverCloseTimer.current);
						hoverCloseTimer.current = null;
					}
				};
				const scheduleHoverClose = () => {
					cancelHoverClose();
					hoverCloseTimer.current = setTimeout(() => setHovered(null), 150);
				};
				(0, react.useEffect)(() => () => cancelHoverClose(), []);
				const pinKey = `dsh-overview:v1:pinned:${sessionId}`;
				const readPinned = (key) => {
					try {
						return typeof window !== "undefined" && window.localStorage.getItem(key) === "1";
					} catch {
						return false;
					}
				};
				const [open, setOpen] = (0, react.useState)(false);
				const [userPinned, setUserPinned] = (0, react.useState)(() => readPinned(pinKey));
				const [hasRoom, setHasRoom] = (0, react.useState)(false);
				const [isGliding, setIsGliding] = (0, react.useState)(false);
				const glideTimerRef = (0, react.useRef)(null);
				(0, react.useEffect)(() => {
					setUserPinned(readPinned(pinKey));
				}, [pinKey]);
				(0, react.useEffect)(() => () => {
					if (glideTimerRef.current) clearTimeout(glideTimerRef.current);
				}, []);
				const [sectionOpenMap, setSectionOpenMap] = (0, react.useState)({});
				const lastSeenCountsRef = (0, react.useRef)({});
				const hasOpenedOnceRef = (0, react.useRef)(false);
				const [openBaseline, setOpenBaseline] = (0, react.useState)({});
				const isSectionOpen = (id, defaultOpen = true) => Object.prototype.hasOwnProperty.call(sectionOpenMap, id) ? sectionOpenMap[id] : defaultOpen;
				const toggleSection = (id, next) => setSectionOpenMap((prev) => ({
					...prev,
					[id]: next
				}));
				const clearHoverNow = () => {
					cancelHoverClose();
					setHovered(null);
				};
				const [bookmarks, setBookmarks] = (0, react.useState)([]);
				const [inputs, setInputs] = (0, react.useState)([]);
				const [subagents, setSubagents] = (0, react.useState)([]);
				const [subagentSummaries, setSubagentSummaries] = (0, react.useState)({});
				const [jobs, setJobs] = (0, react.useState)([]);
				const [observedJobs, setObservedJobs] = (0, react.useState)({});
				const [dismissedJobIds, setDismissedJobIds] = (0, react.useState)([]);
				const [hovered, setHovered] = (0, react.useState)(null);
				const [layout, setLayout] = (0, react.useState)({
					pinned: false,
					top: 56,
					left: 16,
					maxHeight: 580
				});
				const prefs = registry.getPreferences();
				const actions = registry.getActions(sessionId);
				const sections = registry.getSections(sessionId);
				const todos = registry.getSessionTodos(sessionId);
				const badge = registry.getActiveBadge(sessionId);
				(0, react.useEffect)(() => {
					if (!prefs.enablePresentBookmarks && !prefs.enableInputs) {
						setBookmarks([]);
						setInputs([]);
						return;
					}
					const presentKey = `dsh-overview:v1:present:${sessionId}`;
					const inputKey = `dsh-overview:v1:inputs:${sessionId}`;
					const pane = findConversationPane(anchorRef.current) ?? document.querySelector("main") ?? document.body;
					const refresh = () => {
						if (prefs.enablePresentBookmarks) {
							const cachedPresent = readCachedItems(presentKey);
							const livePresent = scanPresentBookmarks(pane);
							const mergedPresent = [];
							const upsertPresent = (item) => {
								const target = item.path || item.label;
								if (!target) return;
								const idx = mergedPresent.findIndex((existing) => isSamePresentedPath(existing.path || existing.label, target));
								if (idx >= 0) {
									const prev = mergedPresent[idx];
									const preferNewPath = (item.path || "").length >= (prev.path || "").length;
									mergedPresent[idx] = {
										...prev,
										...item,
										path: preferNewPath ? item.path : prev.path,
										label: item.label || prev.label
									};
								} else mergedPresent.push(item);
							};
							for (const item of cachedPresent) {
								const id = item.path || item.label;
								if (id) upsertPresent({
									key: item.key || id,
									label: item.label,
									path: item.path
								});
							}
							for (const item of livePresent) upsertPresent(item);
							setBookmarks(mergedPresent);
							if (livePresent.length > 0) writeCachedItems(presentKey, mergedPresent.map((b) => ({
								key: b.key,
								label: b.label,
								path: b.path
							})));
						} else setBookmarks([]);
						if (prefs.enableInputs) {
							const cachedInputs = readCachedItems(inputKey);
							const liveInputs = scanInputMaterials(pane);
							const inputsByLabel = /* @__PURE__ */ new Map();
							for (const item of cachedInputs) if (item.label) inputsByLabel.set(item.label, {
								key: item.key || item.label,
								label: item.label
							});
							for (const item of liveInputs) if (item.label) inputsByLabel.set(item.label, item);
							const mergedInputs = [...inputsByLabel.values()];
							setInputs(mergedInputs);
							if (liveInputs.length > 0) writeCachedItems(inputKey, mergedInputs.map((i) => ({
								key: i.key,
								label: i.label
							})));
						} else setInputs([]);
					};
					refresh();
					if (!pane || typeof MutationObserver === "undefined") return;
					const observer = new MutationObserver(refresh);
					observer.observe(pane, {
						childList: true,
						subtree: true
					});
					return () => observer.disconnect();
				}, [
					sessionId,
					prefs.enablePresentBookmarks,
					prefs.enableInputs
				]);
				(0, react.useEffect)(() => {
					if (typeof ResizeObserver === "undefined" || typeof document === "undefined") return;
					const anchor = anchorRef.current;
					let header = anchor?.closest("header") ?? anchor?.parentElement;
					while (header && header !== document.body && header.clientWidth < 360) header = header.parentElement;
					if (!header) return;
					const measure = () => {
						const cardWidth = 296;
						const rect = header.getBoundingClientRect();
						const pinnedLeft = Math.round(Math.max(12, rect.left + 16));
						const cardRight = pinnedLeft + cardWidth;
						let overlapsStream = false;
						const pane = findConversationPane(anchor);
						if (pane) for (const el of pane.querySelectorAll("article, [data-message-id], .prose, .markdown-body, p, table, pre")) {
							if (header.contains(el)) continue;
							const r = el.getBoundingClientRect();
							if (r.width > 0 && r.height > 0 && r.left < cardRight + 16) {
								overlapsStream = true;
								break;
							}
						}
						const room = rect.width >= 1400 && !overlapsStream;
						setHasRoom(room);
						const pinned = userPinned && room;
						const btnRect = anchor?.getBoundingClientRect();
						const top = Math.round(pinned ? rect.bottom + 12 : (btnRect?.bottom ?? rect.bottom) + 6);
						const popoverLeft = Math.round(Math.max(12, Math.min(window.innerWidth - cardWidth - 12, (btnRect?.right ?? rect.right) - cardWidth)));
						const left = pinned ? pinnedLeft : popoverLeft;
						const paneRect = pane?.getBoundingClientRect();
						const bottomLimit = paneRect && paneRect.bottom > top + 120 ? paneRect.bottom - 16 : window.innerHeight - 16;
						const maxHeight = Math.round(Math.max(220, bottomLimit - top));
						setLayout({
							pinned,
							top,
							left,
							maxHeight
						});
					};
					measure();
					const observer = new ResizeObserver(measure);
					observer.observe(header);
					window.addEventListener("resize", measure);
					return () => {
						observer.disconnect();
						window.removeEventListener("resize", measure);
					};
				}, [
					sessionId,
					open,
					userPinned
				]);
				(0, react.useEffect)(() => {
					if (layout.pinned) setOpen(false);
				}, [layout.pinned]);
				(0, react.useEffect)(() => {
					if (!open || layout.pinned || typeof document === "undefined") return;
					const onPointer = (event) => {
						const target = event.target;
						if (!anchorRef.current?.contains(target) && !target?.closest(".dsh-ov-portal")) setOpen(false);
					};
					const onKey = (event) => {
						if (event.key === "Escape") setOpen(false);
					};
					document.addEventListener("pointerdown", onPointer);
					document.addEventListener("keydown", onKey);
					return () => {
						document.removeEventListener("pointerdown", onPointer);
						document.removeEventListener("keydown", onKey);
					};
				}, [open, layout.pinned]);
				(0, react.useEffect)(() => {
					const sessions = sessionsRef.current;
					if (!sessions?.list) {
						setSubagents([]);
						setSubagentSummaries({});
						return;
					}
					const sync = () => {
						const snap = sessions.list.getSnapshot();
						const proj = snap?.projectionsBySession?.[sessionId];
						const catalog = proj?.state === "ready" ? proj.values?.subagentCatalog : void 0;
						const list = Array.isArray(catalog) ? catalog : [];
						setSubagents(list);
						setSubagentSummaries(snap?.byId ?? {});
						for (const entry of list) if (entry?.id && !snap?.byId?.[entry.id]?.projectionValues?.tokenUsage && entry.mode !== "external") sessions.refreshProjections?.(entry.id);
					};
					sync();
					if (sessions.list.getSnapshot()?.projectionsBySession?.[sessionId]?.state !== "ready") sessions.refreshProjections?.(sessionId);
					const off = sessions.list.subscribe?.(sync);
					return () => off?.();
				}, [sessionId, svcVer]);
				(0, react.useEffect)(() => {
					const jobsSvc = jobsRef.current;
					if (!jobsSvc?.state) {
						setJobs([]);
						setObservedJobs({});
						return;
					}
					const unwatch = jobsSvc.watchRows?.(sessionId);
					const sync = () => {
						const snap = jobsSvc.state.getSnapshot();
						const rows = snap?.rows?.[sessionId];
						setJobs(Array.isArray(rows) ? rows : []);
						setObservedJobs(snap?.observed ?? {});
					};
					sync();
					const off = jobsSvc.state.subscribe?.(sync);
					return () => {
						off?.();
						unwatch?.();
					};
				}, [sessionId, svcVer]);
				(0, react.useEffect)(() => {
					if (hovered?.kind !== "job") return;
					const jobsSvc = jobsRef.current;
					const job = jobs.find((j) => String(j.id) === hovered.id);
					if (!jobsSvc?.observe || !job) return;
					return jobsSvc.observe(sessionId, job.id);
				}, [
					sessionId,
					hovered?.kind,
					hovered?.id,
					jobs
				]);
				(0, react.useEffect)(() => {
					if (!open) setHovered(null);
				}, [open]);
				const visibleJobs = jobs.filter((j) => !dismissedJobIds.includes(String(j.id)));
				const showHover = (event, info) => {
					cancelHoverClose();
					const cardRect = cardRef.current?.getBoundingClientRect();
					const rowRect = event.currentTarget.getBoundingClientRect();
					const topPx = Math.round(Math.max(12, Math.min(rowRect.top, window.innerHeight - 240)));
					if (layout.pinned) {
						const leftPx = Math.round((cardRect?.right ?? rowRect.right) + 8);
						setHovered({
							...info,
							top: topPx,
							left: leftPx
						});
					} else {
						const rightPx = Math.round(window.innerWidth - (cardRect?.left ?? rowRect.left) + 8);
						setHovered({
							...info,
							top: topPx,
							right: rightPx
						});
					}
				};
				const activeTodos = prefs.enableTodos ? todos : [];
				const activeSubagents = prefs.enableSubagents ? subagents : [];
				const activeJobs = prefs.enableJobs ? visibleJobs : [];
				const activeInputs = prefs.enableInputs ? inputs : [];
				const activeBookmarks = prefs.enablePresentBookmarks ? bookmarks : [];
				const currentCounts = {
					"builtin:subagents": activeSubagents.length,
					"builtin:jobs": activeJobs.length,
					"builtin:inputs": activeInputs.length,
					"builtin:present": activeBookmarks.length
				};
				for (const sec of sections) if (sec.trackDelta) {
					const b = typeof sec.badge === "function" ? sec.badge(sessionId) : sec.badge;
					if (typeof b === "number" && Number.isFinite(b)) currentCounts[sec.id] = b;
				}
				(0, react.useEffect)(() => {
					if (open || layout.pinned) if (!hasOpenedOnceRef.current) {
						hasOpenedOnceRef.current = true;
						setOpenBaseline({ ...currentCounts });
					} else setOpenBaseline({ ...lastSeenCountsRef.current });
					else if (hasOpenedOnceRef.current) lastSeenCountsRef.current = { ...currentCounts };
				}, [open, layout.pinned]);
				const deltaFor = (id, count) => {
					if (!prefs.enableDelta || !Object.prototype.hasOwnProperty.call(openBaseline, id)) return 0;
					return count - openBaseline[id];
				};
				const hasContent = actions.length > 0 || sections.length > 0 || activeTodos.length > 0 || activeBookmarks.length > 0 || activeInputs.length > 0 || activeSubagents.length > 0 || activeJobs.length > 0;
				const tr = (k, fallback) => {
					const res = t?.(k);
					return res && res !== k ? res : fallback;
				};
				const card = hasContent && (layout.pinned || open) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `dsh-ov-portal${isGliding ? " is-gliding" : ""}`,
					style: {
						position: "fixed",
						top: layout.top,
						left: layout.left,
						zIndex: 45
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						ref: cardRef,
						className: `dsh-ov-card${layout.pinned ? " is-pinned" : " is-popover"}`,
						style: { maxHeight: layout.maxHeight },
						"aria-label": tr("title", "会话总览"),
						onMouseEnter: cancelHoverClose,
						onMouseLeave: scheduleHoverClose,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ov-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ov-title",
								children: tr("title", "会话总览")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ov-pin-btn",
								"aria-pressed": userPinned,
								"aria-label": userPinned ? "Unpin" : "Pin",
								title: userPinned ? hasRoom ? "取消固定" : "已固定（空间不足时自动隐藏）" : "固定总览",
								onClick: () => {
									const next = !userPinned;
									setUserPinned(next);
									try {
										if (next) window.localStorage.setItem(pinKey, "1");
										else window.localStorage.removeItem(pinKey);
									} catch {}
									if (glideTimerRef.current) clearTimeout(glideTimerRef.current);
									setIsGliding(true);
									glideTimerRef.current = setTimeout(() => setIsGliding(false), 420);
									setOpen(!next);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, { pinned: userPinned })
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ov-body",
							children: [
								actions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ov-actions",
									onMouseEnter: clearHoverNow,
									children: actions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dsh-ov-action",
										disabled: action.disabled,
										onClick: () => {
											action.onClick(sessionId);
											setOpen(false);
										},
										children: [
											action.icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ov-action-icon",
												children: typeof action.icon === "function" ? action.icon() : action.icon
											}) : null,
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ov-action-label",
												children: action.label
											}),
											action.badge !== void 0 && action.badge !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ov-action-badge",
												children: action.badge
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ov-chevron",
												"aria-hidden": "true",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {})
											})
										]
									}, action.id))
								}),
								sections.map((section) => {
									const badgeVal = typeof section.badge === "function" ? section.badge(sessionId) : section.badge;
									const delta = section.trackDelta && typeof badgeVal === "number" ? deltaFor(section.id, badgeVal) : void 0;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
										section,
										sessionId,
										renderSlot,
										openState: isSectionOpen(section.id, section.defaultOpen !== false),
										onToggleOpen: (next) => toggleSection(section.id, next),
										delta,
										onHeaderEnter: clearHoverNow
									}, section.id);
								}),
								activeTodos.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
									openState: isSectionOpen("builtin:todos", sections.length === 0),
									onToggleOpen: (next) => toggleSection("builtin:todos", next),
									onHeaderEnter: clearHoverNow,
									section: {
										id: "builtin:todos",
										title: tr("todosTitle", "待办"),
										badge: `${activeTodos.filter((item) => item.status === "completed").length}/${activeTodos.length}`,
										defaultOpen: sections.length === 0,
										render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
											className: "dsh-ov-list",
											onMouseEnter: clearHoverNow,
											children: activeTodos.map((item, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewItem, {
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: todoDotState(item.status) }),
												label: item.content,
												muted: item.status === "completed"
											}, `${idx}:${item.content}`))
										})
									},
									sessionId
								}),
								activeInputs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
									openState: isSectionOpen("builtin:inputs", sections.length === 0 && activeBookmarks.length === 0),
									onToggleOpen: (next) => toggleSection("builtin:inputs", next),
									delta: deltaFor("builtin:inputs", activeInputs.length),
									onHeaderEnter: clearHoverNow,
									section: {
										id: "builtin:inputs",
										title: tr("inputsTitle", "输入材料"),
										badge: activeInputs.length,
										defaultOpen: sections.length === 0 && activeBookmarks.length === 0,
										render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
											className: "dsh-ov-list",
											onMouseEnter: clearHoverNow,
											children: activeInputs.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewItem, {
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
													kind: (0, _deepseek_ai_dsh_client_ui_primitives.classifyFileType)(item.label),
													size: 16
												}),
												label: item.label,
												onClick: item.element ? () => {
													item.element?.click();
													item.element?.scrollIntoView({
														behavior: "smooth",
														block: "center"
													});
													setOpen(false);
												} : void 0
											}, item.key))
										})
									},
									sessionId
								}),
								activeSubagents.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
									openState: isSectionOpen("builtin:subagents", false),
									onToggleOpen: (next) => toggleSection("builtin:subagents", next),
									delta: deltaFor("builtin:subagents", activeSubagents.length),
									onHeaderEnter: clearHoverNow,
									section: {
										id: "builtin:subagents",
										title: tr("subagentsTitle", "子智能体"),
										badge: activeSubagents.length,
										defaultOpen: false,
										render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
											className: "dsh-ov-list",
											children: activeSubagents.map((agent, idx) => {
												const summary = subagentSummaries[agent.id];
												const title = String(agent.label || summary?.title || agent.name || agent.id || `#${idx + 1}`);
												const sub = String(agent.name || agent.mode || "");
												const tokens = formatCompactTokens(summary?.projectionValues?.tokenUsage);
												const duration = formatDurationMs(subagentDurationMs(summary, agent.activity));
												const state = agent.activity === "running" ? "ongoing" : agent.mode !== "external" && (agent.activity === "inactive" || summary?.projectionValues?.tokenUsage != null || summary != null) ? "done" : "idle";
												const address = {
													parentSessionId: sessionId,
													childSessionId: agent.id,
													mode: agent.mode
												};
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewItem, {
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state }),
													label: sub || title,
													onMouseEnter: (e) => showHover(e, {
														kind: "subagent",
														id: String(agent.id ?? idx),
														title,
														sub: sub !== title ? sub : "",
														tokens,
														duration,
														dotState: state
													}),
													onMouseLeave: scheduleHoverClose,
													onClick: () => {
														if (sidebarRightRef.current?.openResource && agent.mode) {
															const q = new URLSearchParams({
																parent: sessionId,
																mode: agent.mode
															});
															sidebarRightRef.current.openResource(`dsh-resource://subagentchat/session/${encodeURIComponent(agent.id)}?${q}`, {
																kind: "subagentchat",
																preferNewPane: true
															});
														} else workspaceRef.current?.openSession?.(address);
														setOpen(false);
													}
												}, String(agent.id ?? idx));
											})
										})
									},
									sessionId
								}),
								activeJobs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
									openState: isSectionOpen("builtin:jobs", false),
									onToggleOpen: (next) => toggleSection("builtin:jobs", next),
									delta: deltaFor("builtin:jobs", activeJobs.length),
									onHeaderEnter: clearHoverNow,
									section: {
										id: "builtin:jobs",
										title: tr("jobsTitle", "后台任务"),
										badge: activeJobs.length,
										defaultOpen: false,
										render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
											className: "dsh-ov-list",
											children: activeJobs.map((job, idx) => {
												const idKey = String(job.id ?? idx);
												const label = String(job.label || job.command || job.title || idKey);
												const rawDetail = job.progress ?? job.detail;
												const detail = typeof rawDetail === "string" || typeof rawDetail === "number" ? String(rawDetail) : "";
												const live = job.status === "running" || job.status === "stopping";
												const state = live ? "ongoing" : job.status === "succeeded" || job.status === "done" || job.status === "exited" || job.status === "completed" ? "done" : "idle";
												const elapsed = job.startedAt && (live || job.finishedAt) ? formatDurationMs((live ? Date.now() : Number(job.finishedAt)) - Number(job.startedAt)) : "";
												const statusText = [detail || job.status, elapsed].filter(Boolean).join("  ");
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewItem, {
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state }),
													label,
													onMouseEnter: (e) => showHover(e, {
														kind: "job",
														id: idKey,
														title: label,
														sub: "",
														dotState: state,
														jobKind: String(job.kind ?? ""),
														jobStatusText: statusText
													}),
													onMouseLeave: scheduleHoverClose,
													onClick: () => {
														setActiveJobPreview({
															sessionId,
															job
														});
														sidebarRightRef.current?.openTab?.(JOB_TAB_KIND);
														setOpen(false);
													},
													action: {
														icon: live ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFillRegular, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),
														label: live ? "Stop" : "Remove",
														title: live ? "停止任务" : "移除记录",
														onClick: () => {
															if (live) jobsRef.current?.kill?.(sessionId, job.id);
															else {
																setDismissedJobIds((prev) => prev.includes(idKey) ? prev : [...prev, idKey]);
																if (hovered?.id === idKey) setHovered(null);
															}
														}
													}
												}, idKey);
											})
										})
									},
									sessionId
								}),
								activeBookmarks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewSectionBox, {
									openState: isSectionOpen("builtin:present", sections.length === 0),
									onToggleOpen: (next) => toggleSection("builtin:present", next),
									delta: deltaFor("builtin:present", activeBookmarks.length),
									onHeaderEnter: clearHoverNow,
									section: {
										id: "builtin:present",
										title: tr("presentTitle", "关键产出"),
										badge: activeBookmarks.length,
										defaultOpen: sections.length === 0,
										render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
											className: "dsh-ov-list",
											onMouseEnter: clearHoverNow,
											children: activeBookmarks.map((bm) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewItem, {
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
													kind: (0, _deepseek_ai_dsh_client_ui_primitives.classifyFileType)(bm.label),
													size: 16
												}),
												label: bm.label,
												title: bm.path,
												onClick: () => {
													openPresentBookmark(bm, sessionId, sidebarRightRef.current);
													setOpen(false);
												}
											}, bm.key))
										})
									},
									sessionId
								})
							]
						})]
					})
				}) : null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ov-anchor",
					ref: anchorRef,
					hidden: !hasContent,
					children: [
						hasContent && !layout.pinned && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: tr("trigger", "总览"),
							side: "bottom",
							align: "end",
							portal: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								className: "dsh-ov-trigger-btn",
								"aria-label": tr("trigger", "总览"),
								"aria-expanded": open,
								"aria-haspopup": "menu",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, {}),
								onClick: () => setOpen((v) => !v),
								children: badge && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ov-trigger-dot-wrap",
									"data-tone": badge.tone,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-ov-trigger-dot" })
								})
							})
						}),
						card && (typeof document !== "undefined" && typeof react_dom.createPortal === "function" ? (0, react_dom.createPortal)(card, document.body) : card),
						hovered && (open || layout.pinned) && typeof document !== "undefined" && typeof react_dom.createPortal === "function" && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ov-portal",
							style: {
								position: "fixed",
								top: hovered.top,
								...hovered.left !== void 0 ? { left: hovered.left } : { right: hovered.right },
								zIndex: 46
							},
							onMouseEnter: cancelHoverClose,
							onMouseLeave: scheduleHoverClose,
							children: hovered.kind === "subagent" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ov-hover-card dsh-ov-hover-subagent",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ov-todo-glyph",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: hovered.dotState ?? "idle" })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ov-hover-sub-main",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ov-hover-title",
											children: hovered.title
										}), hovered.sub && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ov-hover-sub",
											children: hovered.sub
										})]
									}),
									(hovered.tokens || hovered.duration) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ov-hover-metrics",
										children: [hovered.tokens && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hovered.tokens }), hovered.duration && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hovered.duration })]
									})
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ov-hover-card dsh-ov-hover-job",
								children: (() => {
									const obs = observedJobs[hovered.id];
									const tail = obs?.text ?? obs?.output?.tail ?? obs?.tail ?? "";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewTerminalView, {
										command: hovered.title,
										output: tail
									});
								})()
							})
						}), document.body)
					]
				});
			}
			function TodoProjectionBridge({ sessionId, useProjection }) {
				const projected = useProjection?.("todos");
				const list = Array.isArray(projected) ? projected : [];
				(0, react.useEffect)(() => {
					if (sessionId) registry.setSessionTodos(sessionId, list);
				}, [sessionId, list]);
				return null;
			}
			slots.inject("conversation.input.dock", () => slots.register({
				name: "conversation.input.dock",
				id: "dsh-overview.todo-bridge",
				order: 999
			}, TodoProjectionBridge));
			slots.inject("conversation.session.header.utilities", () => slots.register({
				name: "conversation.session.header.utilities",
				id: "dsh-overview.trigger",
				order: 10,
				locale: NS,
				children: {
					"overview.action": {
						kind: "list",
						scope: "session"
					},
					"overview.section": {
						kind: "list",
						scope: "session"
					},
					"overview.trigger.badge": {
						kind: "list",
						scope: "session"
					}
				}
			}, OverviewTrigger));
		}
		var client_default = {
			name: "dsh-overview-client",
			inject: ["slots", "locale"],
			apply
		};
		//#endregion
		exports.OverviewItem = OverviewItem;
		exports.OverviewRegistry = OverviewRegistry;
		exports.default = client_default;
		return module.exports;
	}
});
