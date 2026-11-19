export interface PresentBookmark {
  key: string;
  label: string;
  path: string;
  element?: HTMLElement | null;
  previewButton?: HTMLElement | null;
}

export interface InputMaterialItem {
  key: string;
  label: string;
  element?: HTMLElement | null;
}

export function readCachedItems<T>(storageKey: string): T[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedItems(storageKey: string, items: unknown[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

function normalizePresentedPath(p: string): string {
  return p.trim().replace(/^\.\//, '').replace(/\/+/g, '/');
}

export function isSamePresentedPath(a: string, b: string): boolean {
  const na = normalizePresentedPath(a);
  const nb = normalizePresentedPath(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.startsWith('/') && !nb.startsWith('/') && na.endsWith(`/${nb}`)) return true;
  if (nb.startsWith('/') && !na.startsWith('/') && nb.endsWith(`/${na}`)) return true;
  return false;
}

export function scanPresentBookmarks(pane: HTMLElement | null): PresentBookmark[] {
  if (!pane || typeof document === 'undefined') return [];
  const found: PresentBookmark[] = [];
  const hasPath = (candidate: string) => found.some((item) => isSamePresentedPath(item.path || item.label, candidate));

  pane.querySelectorAll<HTMLElement>('[data-presented-file]').forEach((card, idx) => {
    const previewBtn = card.querySelector<HTMLElement>('button[aria-label], [role="button"][aria-label]');
    const fullPath = previewBtn?.getAttribute('title')?.trim() ?? '';
    const spans = [...card.querySelectorAll('span')].map((s) => (s.textContent || '').trim()).filter(Boolean);
    const fileName = (fullPath ? fullPath.split('/').filter(Boolean).pop() : '') || spans[0] || `#${idx + 1}`;
    const dedupKey = fullPath || fileName;
    if (hasPath(dedupKey)) return;
    found.push({
      key: `pf:${idx}:${dedupKey}`,
      label: fileName.slice(0, 64),
      path: fullPath || fileName,
      element: card,
      previewButton: previewBtn,
    });
  });

  pane.querySelectorAll<HTMLElement>('[data-tool-name="present"], [data-tool="present"]').forEach((el, idx) => {
    const spans = [...el.querySelectorAll('span')];
    const pathSpan = spans.reverse().find((s) => {
      const txt = (s.textContent || '').trim();
      return txt.length > 0 && (txt.includes('/') || /\.[a-z0-9]{1,8}$/i.test(txt));
    });
    const rawPaths = pathSpan?.textContent?.trim() ?? '';
    const parts = rawPaths
      ? rawPaths.split(',').map((p) => p.trim()).filter(Boolean)
      : [(el.getAttribute('aria-label') || `#${idx + 1}`).trim()];
    parts.forEach((p, subIdx) => {
      if (hasPath(p)) return;
      const fileName = p.split('/').filter(Boolean).pop() ?? p;
      found.push({
        key: `pt:${idx}:${subIdx}:${p}`,
        label: fileName.slice(0, 64),
        path: p,
        element: el,
      });
    });
  });

  return found;
}

export function scanInputMaterials(pane: HTMLElement | null): InputMaterialItem[] {
  if (!pane || typeof document === 'undefined') return [];
  const found: InputMaterialItem[] = [];
  const seen = new Set<string>();
  pane
    .querySelectorAll<HTMLElement>(
      '[data-message-attachments] span[title], [data-message-attachments] button[title], [data-message-attachments] a[title]',
    )
    .forEach((el, idx) => {
      const name = (el.getAttribute('title') || el.textContent || '').trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      found.push({ key: `in:${idx}:${name}`, label: name, element: el });
    });
  return found;
}

export function openPresentBookmark(bm: PresentBookmark, sessionId: string, sidebarRight: any): void {
  if (bm.previewButton) {
    bm.previewButton.click();
    return;
  }
  if (bm.element) {
    const scope = bm.element.closest('article, [data-message-id], [data-turn-id]') ?? document.body;
    const targets = [...scope.querySelectorAll<HTMLElement>('button[aria-label], [role="button"][aria-label]')];
    const previewBtn = targets.find((btn) => {
      const label = btn.getAttribute('aria-label') ?? '';
      return (bm.path && label.includes(bm.path)) || label.includes(bm.label);
    });
    if (previewBtn) {
      previewBtn.click();
      return;
    }
    bm.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (bm.path.startsWith('/') && sidebarRight?.openResource) {
    sidebarRight.openResource(`dsh-resource://file/session/${encodeURIComponent(sessionId)}${bm.path}`);
  }
}

export function findConversationPane(anchor: HTMLElement | null): HTMLElement | null {
  if (!anchor) return null;
  let header = (anchor.closest('header') ?? anchor.parentElement) as HTMLElement | null;
  while (header && header !== document.body && header.clientWidth < 360) header = header.parentElement;
  return header?.closest('section, main') ?? header?.parentElement?.parentElement ?? header?.parentElement ?? null;
}
