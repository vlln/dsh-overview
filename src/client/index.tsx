import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  Button,
  classifyFileType,
  FileTypeIcon,
  IconBrowseOutlineRegular,
  IconChevronRightOutlineRegular,
  IconStopFillRegular,
  IconTrashOutlineRegular,
  StateDot,
  Switch,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { OverviewRegistry } from './registry.ts';
import {
  findConversationPane,
  isSamePresentedPath,
  openPresentBookmark,
  readCachedItems,
  scanInputMaterials,
  scanPresentBookmarks,
  writeCachedItems,
  type InputMaterialItem,
  type PresentBookmark,
} from './scanners.ts';
import { OVERVIEW_STYLE_ID, overviewStyle } from './style.ts';
import { OverviewTerminalView } from './terminal.tsx';

export type {
  OverviewActionSpec,
  OverviewBadgeSpec,
  OverviewPreferences,
  OverviewSectionSpec,
  OverviewTone,
} from './registry.ts';
export { OverviewRegistry } from './registry.ts';

const todoDotState = (status: string): 'done' | 'ongoing' | 'idle' =>
  status === 'completed' ? 'done' : status === 'in_progress' ? 'ongoing' : 'idle';

const PinIcon = ({ pinned }: { pinned: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M9.8 2.4l3.8 3.8-1.1 1.1-1-.3-2.4 2.4.5 2.5-1 1-2.5-2.5-3.2 3.2-.7-.7 3.2-3.2L3 7.2l1-1 2.5.5 2.4-2.4-.3-1 1.2-.9z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      fill={pinned ? 'currentColor' : 'none'}
    />
  </svg>
);

function formatCompactTokens(usage: any): string {
  if (!usage || typeof usage !== 'object') return '';
  const total =
    Number(usage.total_tokens ?? usage.totalTokens ?? 0) ||
    Number(usage.input_tokens ?? usage.inputTokens ?? 0) +
      Number(usage.output_tokens ?? usage.outputTokens ?? 0) +
      Number(usage.cache_read_input_tokens ?? usage.cachedInputTokens ?? 0);
  if (!Number.isFinite(total) || total <= 0) return '';
  if (total < 1000) return `${total} tok`;
  if (total < 1_000_000) return `${(total / 1000).toFixed(1).replace(/\.0$/, '')}K tok`;
  return `${(total / 1_000_000).toFixed(1).replace(/\.0$/, '')}M tok`;
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem ? `${min}分${rem}秒` : `${min}分`;
}

function subagentDurationMs(summary: any, activity: unknown): number {
  const timing = summary?.projectionValues?.subagentTiming;
  if (timing && typeof timing === 'object') {
    const settled = Number(timing.settledMs ?? 0);
    if (!timing.active) return settled;
    const end = activity === 'running' ? Date.now() : Number(timing.active.through ?? Date.now());
    return settled + Math.max(0, end - Number(timing.active.since ?? end));
  }
  if (summary?.updatedAt && summary?.createdAt) {
    return Math.max(0, Number(summary.updatedAt) - Number(summary.createdAt));
  }
  return 0;
}

const NS = 'dsh-overview';

function ensureStyle(): () => void {
  if (typeof document === 'undefined') return () => {};
  let el = document.getElementById(OVERVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = OVERVIEW_STYLE_ID;
    el.textContent = overviewStyle;
    document.head.appendChild(el);
  }
  return () => {
    el?.remove();
  };
}

export interface OverviewItemProps {
  icon?: React.ReactNode;
  label: string;
  title?: string;
  muted?: boolean;
  onClick?: () => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLLIElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLLIElement>) => void;
  action?: {
    icon: React.ReactNode;
    label: string;
    title?: string;
    onClick: () => void;
  };
}

export function OverviewItem({
  icon,
  label,
  muted,
  onClick,
  onMouseEnter,
  onMouseLeave,
  action,
}: OverviewItemProps) {
  const rowClass = `dsh-ov-item-row${onClick ? ' is-clickable' : ''}${muted ? ' is-muted' : ''}`;
  return (
    <li className={rowClass} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {onClick ? (
        <button type="button" className="dsh-ov-item-btn" onClick={onClick}>
          {icon ? <span className="dsh-ov-todo-glyph" aria-hidden="true">{icon}</span> : null}
          <span className="dsh-ov-item-text">{label}</span>
        </button>
      ) : (
        <div className="dsh-ov-item-static">
          {icon ? <span className="dsh-ov-todo-glyph" aria-hidden="true">{icon}</span> : null}
          <span className="dsh-ov-todo-text">{label}</span>
        </div>
      )}
      {action ? (
        <button
          type="button"
          className="dsh-ov-item-act"
          aria-label={action.label}
          title={action.title ?? action.label}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
        >
          {action.icon}
        </button>
      ) : null}
    </li>
  );
}

function bridgeSlotExtensions(ctx: any, registry: OverviewRegistry): () => void {
  if (!ctx?.slots?.entries || !ctx?.slots?.subscribe) return () => {};
  const actionOffs = new Map<string, () => void>();
  const sectionOffs = new Map<string, () => void>();
  const badgeOffs = new Map<string, () => void>();

  const sync = () => {
    const seenActions = new Set<string>();
    for (const entry of ctx.slots.entries('overview.action') ?? []) {
      const opts = entry?.options ?? {};
      const id = String(opts.id ?? '');
      if (!id) continue;
      seenActions.add(id);
      if (!actionOffs.has(id) && typeof opts.onClick === 'function') {
        actionOffs.set(
          id,
          registry.registerAction({
            id: `slot:${id}`,
            order: typeof opts.order === 'number' ? opts.order : 100,
            label: String(opts.label ?? id),
            icon: opts.icon,
            badge: opts.badge,
            disabled: Boolean(opts.disabled),
            visible: typeof opts.visible === 'function' ? opts.visible : undefined,
            onClick: opts.onClick,
          }),
        );
      }
    }
    for (const [id, off] of actionOffs) {
      if (!seenActions.has(id)) {
        off();
        actionOffs.delete(id);
      }
    }

    const seenSections = new Set<string>();
    for (const entry of ctx.slots.entries('overview.section') ?? []) {
      const opts = entry?.options ?? {};
      const id = String(opts.id ?? '');
      if (!id) continue;
      seenSections.add(id);
      if (!sectionOffs.has(id)) {
        sectionOffs.set(
          id,
          registry.registerSection({
            id: `slot:${id}`,
            order: typeof opts.order === 'number' ? opts.order : 100,
            title: String(opts.title ?? id),
            badge: opts.badge,
            trackDelta: Boolean(opts.trackDelta),
            defaultOpen: opts.defaultOpen !== false,
            visible: typeof opts.visible === 'function' ? opts.visible : undefined,
            render: (sessionId: string) =>
              typeof opts.render === 'function' ? opts.render(sessionId) : null,
          }),
        );
      }
    }
    for (const [id, off] of sectionOffs) {
      if (!seenSections.has(id)) {
        off();
        sectionOffs.delete(id);
      }
    }

    const seenBadges = new Set<string>();
    for (const entry of ctx.slots.entries('overview.trigger.badge') ?? []) {
      const opts = entry?.options ?? {};
      const id = String(opts.id ?? '');
      if (!id) continue;
      seenBadges.add(id);
      if (!badgeOffs.has(id)) {
        badgeOffs.set(
          id,
          registry.registerBadge({
            id: `slot:${id}`,
            priority: typeof opts.priority === 'number' ? opts.priority : 0,
            tone: opts.tone ?? 'neutral',
            text: opts.text,
            visible: typeof opts.visible === 'function' ? opts.visible : undefined,
          }),
        );
      }
    }
    for (const [id, off] of badgeOffs) {
      if (!seenBadges.has(id)) {
        off();
        badgeOffs.delete(id);
      }
    }
  };

  const off1 = ctx.slots.subscribe('overview.action', sync);
  const off2 = ctx.slots.subscribe('overview.section', sync);
  const off3 = ctx.slots.subscribe('overview.trigger.badge', sync);
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

function apply(ctx: any) {
  const registry = new OverviewRegistry();
  ctx.provide?.('overview', registry);

  ctx.effect(() => ensureStyle(), 'dsh-overview: styles');
  ctx.effect(() => bridgeSlotExtensions(ctx, registry), 'dsh-overview: slot bridge');

  ctx.effect(
    () =>
      ctx.locale.register(NS, {
        en: {
          trigger: 'Overview',
          title: 'Overview',
          presentTitle: 'Deliverables',
          inputsTitle: 'Inputs',
          todosTitle: 'To-dos',
          subagentsTitle: 'Subagents',
          jobsTitle: 'Background Tasks',
          jobTabTitle: 'Background Task',
          modePopover: 'Popover',
          modeAutoDock: 'Auto-dock',
        },
        zh: {
          trigger: '总览',
          title: '会话总览',
          presentTitle: '关键产出',
          inputsTitle: '输入材料',
          todosTitle: '待办',
          subagentsTitle: '子智能体',
          jobsTitle: '后台任务',
          jobTabTitle: '后台任务',
          modePopover: '仅点击弹出',
          modeAutoDock: '宽屏停靠',
        },
      }),
    'dsh-overview: locale',
  );

  const sessionsRef: { current: any } = { current: null };
  const workspaceRef: { current: any } = { current: null };
  const jobsRef: { current: any } = { current: null };
  const sidebarRightRef: { current: any } = { current: null };
  let serviceVersion = 0;
  const serviceListeners = new Set<() => void>();
  const bumpServiceVersion = () => {
    serviceVersion += 1;
    for (const l of serviceListeners) l();
  };
  const subscribeServices = (l: () => void) => {
    serviceListeners.add(l);
    return () => {
      serviceListeners.delete(l);
    };
  };
  const getServiceVersion = () => serviceVersion;
  const JOB_TAB_ID = '@vlln/dsh-overview/job';
  const JOB_TAB_KIND = 'overview-job';
  let activeJobPreview: { sessionId: string; job: any } | null = null;
  const jobPreviewListeners = new Set<() => void>();
  const setActiveJobPreview = (next: { sessionId: string; job: any } | null) => {
    activeJobPreview = next;
    for (const l of jobPreviewListeners) l();
  };

  const tPlugin = ctx.locale.bind(NS);

  function SidebarJobPreview() {
    const [, setTick] = useState(0);
    useEffect(() => {
      const l = () => setTick((n) => n + 1);
      jobPreviewListeners.add(l);
      return () => { jobPreviewListeners.delete(l); };
    }, []);
    const current = activeJobPreview;
    const [observed, setObserved] = useState<any>(null);
    useEffect(() => {
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

    if (!current) return <div className="dsh-ov-sidebar-job"><p className="dsh-ov-sidebar-meta">No task selected.</p></div>;
    const job = current.job;
    const label = String(job.label || job.command || job.title || job.id);
    const rawDetail = job.progress ?? job.detail;
    const detailText = typeof rawDetail === 'string' || typeof rawDetail === 'number' ? String(rawDetail) : '';
    const meta = [job.kind, job.status, detailText].filter(Boolean).join(' · ');
    const tail = observed?.text ?? observed?.output?.tail ?? observed?.tail ?? '';
    return (
      <div className="dsh-ov-sidebar-job">
        <div className="dsh-ov-sidebar-head">
          <span className="dsh-ov-sidebar-title">{tPlugin('jobTabTitle') || 'Background Task'}</span>
          <span className="dsh-ov-sidebar-meta">{meta}</span>
        </div>
        <OverviewTerminalView command={label} output={tail} />
      </div>
    );
  }

  ctx.inject?.(['sessions'], (scope: any) => {
    sessionsRef.current = scope.sessions;
    bumpServiceVersion();
    return () => { sessionsRef.current = null; bumpServiceVersion(); };
  });
  ctx.inject?.(['uiWorkspace'], (scope: any) => {
    workspaceRef.current = scope.uiWorkspace;
    bumpServiceVersion();
    return () => { workspaceRef.current = null; bumpServiceVersion(); };
  });
  ctx.inject?.(['jobs'], (scope: any) => {
    jobsRef.current = scope.jobs;
    bumpServiceVersion();
    return () => { jobsRef.current = null; bumpServiceVersion(); };
  });
  ctx.inject?.(['sidebarRight', 'sidebarRightTabs'], (scope: any) => {
    sidebarRightRef.current = scope.sidebarRight;
    bumpServiceVersion();
    const offTab = scope.sidebarRightTabs?.register?.({
      id: JOB_TAB_ID,
      kind: JOB_TAB_KIND,
      title: () => tPlugin('jobTabTitle') || 'Background Task',
      closable: true,
    });
    const offSlot = ctx.slots.inject('sidebar.right.pane.tab', () =>
      ctx.slots.register(
        { name: 'sidebar.right.pane.tab', key: JOB_TAB_ID, locale: NS },
        SidebarJobPreview,
      ),
    );
    return () => {
      sidebarRightRef.current = null;
      offSlot?.();
      offTab?.();
    };
  });

  const PREFS_STORAGE_KEY = 'dsh-overview:v1:prefs';
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) registry.setPreferences(JSON.parse(saved));
    }
  } catch {
    // ignore storage errors
  }

  let formScopeRef: any = null;
  const formListeners = new Set<() => void>();
  const notifyFormListeners = () => {
    for (const fn of formListeners) fn();
  };

  ctx.inject?.(['configForms'], (scope: any) => {
    const formScope = scope.configForms?.get?.(NS);
    if (!formScope) return () => {};
    formScopeRef = formScope;
    const syncPrefs = () => {
      const snap = formScope.getSnapshot?.();
      if (snap?.status === 'ready' && snap.value && typeof snap.value === 'object') {
        registry.setPreferences(snap.value);
      }
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

  const SETTING_ITEMS: Array<{ key: keyof import('./registry.ts').OverviewPreferences; zh: string; zhDesc: string; en: string; enDesc: string }> = [
    { key: 'enableTodos', zh: '待办（To-dos）', zhDesc: '在总览中同步会话待办清单与完成进度', en: 'To-dos', enDesc: 'Show session to-do progress in Overview' },
    { key: 'enableSubagents', zh: '子智能体（Subagents）', zhDesc: '列出当前会话子智能体并支持 Hover 详情与右侧栏打开', en: 'Subagents', enDesc: 'List session subagents with hover summary and sidebar preview' },
    { key: 'enableJobs', zh: '后台任务（Background Tasks）', zhDesc: '列出后台任务并支持终端预览、停止/移除与右侧栏输出', en: 'Background Tasks', enDesc: 'List background tasks with terminal hover preview and controls' },
    { key: 'enableInputs', zh: '输入材料（Inputs）', zhDesc: '汇总用户上传到会话中的文件', en: 'Inputs', enDesc: 'Collect user-uploaded input files in this session' },
    { key: 'enablePresentBookmarks', zh: '关键产出（Deliverables）', zhDesc: '汇总 present 工具交付的文件并支持直接预览', en: 'Deliverables', enDesc: 'Collect presented deliverable files for quick preview' },
    { key: 'enableDelta', zh: '增量变化标记（+x / -x）', zhDesc: '在列表计数旁显示相对上次打开总览的变化量', en: 'Delta indicators (+x / -x)', enDesc: 'Show count changes since Overview was last opened' },
  ];

  function OverviewSettingsCard({ t }: { t?: (k: string) => string }) {
    const prefsVer = useSyncExternalStore(
      (fn) => registry.subscribe(fn),
      () => registry.getVersion(),
    );
    useSyncExternalStore(
      (fn) => {
        formListeners.add(fn);
        return () => formListeners.delete(fn);
      },
      () => formScopeRef?.getSnapshot?.(),
    );
    void prefsVer;
    const isEn = t?.('trigger') === 'Overview';
    const snap = formScopeRef?.getSnapshot?.();
    const val = registry.getPreferences();
    return (
      <div className="dsh-ov-settings">
        {SETTING_ITEMS.map((item) => {
          const checked = Boolean(val[item.key]);
          return (
            <div key={item.key} className="dsh-ov-setting-row">
              <div className="dsh-ov-setting-info">
                <span className="dsh-ov-setting-label">{isEn ? item.en : item.zh}</span>
                <span className="dsh-ov-setting-desc">{isEn ? item.enDesc : item.zhDesc}</span>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(next: boolean) => {
                  registry.setPreferences({ [item.key]: next });
                  try {
                    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(registry.getPreferences()));
                  } catch {
                    // ignore storage errors
                  }
                  if (snap?.status === 'ready' && snap?.writable !== false && snap?.revision !== undefined) {
                    void formScopeRef?.set?.(item.key, next, snap.revision);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const slots = ctx.get('slots');
  slots.inject('plugins.bundle.config', () =>
    slots.register(
      {
        name: 'plugins.bundle.config',
        key: '@vlln/dsh-overview',
        locale: NS,
      },
      OverviewSettingsCard,
    ),
  );

  function OverviewSectionBox({
    section,
    sessionId,
    renderSlot,
    openState,
    onToggleOpen,
    delta,
    onHeaderEnter,
  }: {
    section: ReturnType<OverviewRegistry['getSections']>[number];
    sessionId: string;
    renderSlot?: (name: string, props?: Record<string, unknown>, options?: Record<string, unknown>) => React.ReactNode;
    openState?: boolean;
    onToggleOpen?: (next: boolean) => void;
    delta?: number;
    onHeaderEnter?: () => void;
  }) {
    const [localOpen, setLocalOpen] = useState(section.defaultOpen !== false);
    const open = openState !== undefined ? openState : localOpen;
    const toggle = () => {
      const next = !open;
      if (onToggleOpen) onToggleOpen(next);
      else setLocalOpen(next);
    };
    const badgeValue = typeof section.badge === 'function' ? section.badge(sessionId) : section.badge;
    const isSlot = section.id.startsWith('slot:');
    const slotId = isSlot ? section.id.slice(5) : '';
    const body = isSlot && renderSlot
      ? (section.render(sessionId) ?? renderSlot('overview.section', { sessionId }, { only: slotId }))
      : section.render(sessionId);

    return (
      <div className="dsh-ov-section">
        <button
          type="button"
          className="dsh-ov-section-btn"
          aria-expanded={open}
          onMouseEnter={onHeaderEnter}
          onClick={toggle}
        >
          <span>{section.title}</span>
          {badgeValue !== undefined && badgeValue !== null && badgeValue !== '' && (
            <span className="dsh-ov-section-count">{badgeValue}</span>
          )}
          {delta !== undefined && delta !== 0 && (
            <span className="dsh-ov-section-delta" data-sign={delta > 0 ? 'pos' : 'neg'}>
              {delta > 0 ? `+${delta}` : String(delta)}
            </span>
          )}
          <span className="dsh-ov-section-chevron" aria-hidden="true">
            <IconChevronRightOutlineRegular />
          </span>
        </button>
        {open && <div className="dsh-ov-section-body">{body as React.ReactNode}</div>}
      </div>
    );
  }

  function OverviewTrigger({
    sessionId,
    t,
    renderSlot,
  }: {
    sessionId: string;
    t?: (key: string) => string;
    renderSlot?: (name: string, props?: Record<string, unknown>, options?: Record<string, unknown>) => React.ReactNode;
  }) {
    useSyncExternalStore(registry.subscribe, registry.getVersion);
    const svcVer = useSyncExternalStore(subscribeServices, getServiceVersion);
    const anchorRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLElement>(null);
    const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    useEffect(() => () => cancelHoverClose(), []);
    const pinKey = `dsh-overview:v1:pinned:${sessionId}`;
    const readPinned = (key: string) => {
      try {
        return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
      } catch {
        return false;
      }
    };
    const [open, setOpen] = useState(false);
    const [userPinned, setUserPinned] = useState(() => readPinned(pinKey));
    const [hasRoom, setHasRoom] = useState(false);
    const [isGliding, setIsGliding] = useState(false);
    const glideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      setUserPinned(readPinned(pinKey));
    }, [pinKey]);
    useEffect(() => () => {
      if (glideTimerRef.current) clearTimeout(glideTimerRef.current);
    }, []);
    const [sectionOpenMap, setSectionOpenMap] = useState<Record<string, boolean>>({});
    const lastSeenCountsRef = useRef<Record<string, number>>({});
    const hasOpenedOnceRef = useRef(false);
    const [openBaseline, setOpenBaseline] = useState<Record<string, number>>({});
    const isSectionOpen = (id: string, defaultOpen = true) =>
      Object.prototype.hasOwnProperty.call(sectionOpenMap, id) ? sectionOpenMap[id] : defaultOpen;
    const toggleSection = (id: string, next: boolean) =>
      setSectionOpenMap((prev) => ({ ...prev, [id]: next }));
    const clearHoverNow = () => {
      cancelHoverClose();
      setHovered(null);
    };
    const [bookmarks, setBookmarks] = useState<PresentBookmark[]>([]);
    const [inputs, setInputs] = useState<InputMaterialItem[]>([]);
    const [subagents, setSubagents] = useState<any[]>([]);
    const [subagentSummaries, setSubagentSummaries] = useState<Record<string, any>>({});
    const [jobs, setJobs] = useState<any[]>([]);
    const [observedJobs, setObservedJobs] = useState<Record<string, any>>({});
    const [dismissedJobIds, setDismissedJobIds] = useState<string[]>([]);
    const [hovered, setHovered] = useState<{
      kind: 'job' | 'subagent';
      id: string;
      top: number;
      left?: number;
      right?: number;
      title: string;
      sub: string;
      tokens?: string;
      duration?: string;
      dotState?: 'done' | 'ongoing' | 'idle';
      jobKind?: string;
      jobStatusText?: string;
    } | null>(null);
    const [layout, setLayout] = useState<{ pinned: boolean; top: number; left: number; maxHeight: number }>({
      pinned: false,
      top: 56,
      left: 16,
      maxHeight: 580,
    });

    const prefs = registry.getPreferences();
    const actions = registry.getActions(sessionId);
    const sections = registry.getSections(sessionId);
    const todos = registry.getSessionTodos(sessionId);
    const badge = registry.getActiveBadge(sessionId);

    useEffect(() => {
      if (!prefs.enablePresentBookmarks && !prefs.enableInputs) {
        setBookmarks([]);
        setInputs([]);
        return;
      }
      const presentKey = `dsh-overview:v1:present:${sessionId}`;
      const inputKey = `dsh-overview:v1:inputs:${sessionId}`;
      const pane = findConversationPane(anchorRef.current) ?? document.querySelector('main') ?? document.body;
      const refresh = () => {
        if (prefs.enablePresentBookmarks) {
          const cachedPresent = readCachedItems<{ key: string; label: string; path: string }>(presentKey);
          const livePresent = scanPresentBookmarks(pane);
          const mergedPresent: PresentBookmark[] = [];
          const upsertPresent = (item: PresentBookmark) => {
            const target = item.path || item.label;
            if (!target) return;
            const idx = mergedPresent.findIndex((existing) =>
              isSamePresentedPath(existing.path || existing.label, target),
            );
            if (idx >= 0) {
              const prev = mergedPresent[idx];
              const preferNewPath = (item.path || '').length >= (prev.path || '').length;
              mergedPresent[idx] = {
                ...prev,
                ...item,
                path: preferNewPath ? item.path : prev.path,
                label: item.label || prev.label,
              };
            } else {
              mergedPresent.push(item);
            }
          };
          for (const item of cachedPresent) {
            const id = item.path || item.label;
            if (id) upsertPresent({ key: item.key || id, label: item.label, path: item.path });
          }
          for (const item of livePresent) {
            upsertPresent(item);
          }
          setBookmarks(mergedPresent);
          if (livePresent.length > 0) {
            writeCachedItems(
              presentKey,
              mergedPresent.map((b) => ({ key: b.key, label: b.label, path: b.path })),
            );
          }
        } else {
          setBookmarks([]);
        }

        if (prefs.enableInputs) {
          const cachedInputs = readCachedItems<{ key: string; label: string }>(inputKey);
          const liveInputs = scanInputMaterials(pane);
          const inputsByLabel = new Map<string, InputMaterialItem>();
          for (const item of cachedInputs) {
            if (item.label) inputsByLabel.set(item.label, { key: item.key || item.label, label: item.label });
          }
          for (const item of liveInputs) {
            if (item.label) inputsByLabel.set(item.label, item);
          }
          const mergedInputs = [...inputsByLabel.values()];
          setInputs(mergedInputs);
          if (liveInputs.length > 0) {
            writeCachedItems(
              inputKey,
              mergedInputs.map((i) => ({ key: i.key, label: i.label })),
            );
          }
        } else {
          setInputs([]);
        }
      };
      refresh();
      if (!pane || typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(refresh);
      observer.observe(pane, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [sessionId, prefs.enablePresentBookmarks, prefs.enableInputs]);

    useEffect(() => {
      if (typeof ResizeObserver === 'undefined' || typeof document === 'undefined') return;
      const anchor = anchorRef.current;
      let header = (anchor?.closest('header') ?? anchor?.parentElement) as HTMLElement | null;
      while (header && header !== document.body && header.clientWidth < 360) header = header.parentElement;
      if (!header) return;

      const measure = () => {
        const cardWidth = 296;
        const rect = header!.getBoundingClientRect();
        const pinnedLeft = Math.round(Math.max(12, rect.left + 16));
        const cardRight = pinnedLeft + cardWidth;
        let overlapsStream = false;
        const pane = findConversationPane(anchor);
        if (pane) {
          for (const el of pane.querySelectorAll('article, [data-message-id], .prose, .markdown-body, p, table, pre')) {
            if (header!.contains(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.left < cardRight + 16) {
              overlapsStream = true;
              break;
            }
          }
        }
        const room = rect.width >= 1400 && !overlapsStream;
        setHasRoom(room);
        const pinned = userPinned && room;
        const btnRect = anchor?.getBoundingClientRect();
        const top = Math.round(pinned ? rect.bottom + 12 : (btnRect?.bottom ?? rect.bottom) + 6);
        const popoverLeft = Math.round(
          Math.max(12, Math.min(window.innerWidth - cardWidth - 12, (btnRect?.right ?? rect.right) - cardWidth)),
        );
        const left = pinned ? pinnedLeft : popoverLeft;
        const paneRect = pane?.getBoundingClientRect();
        const bottomLimit = paneRect && paneRect.bottom > top + 120
          ? paneRect.bottom - 16
          : window.innerHeight - 16;
        const maxHeight = Math.round(Math.max(220, bottomLimit - top));
        setLayout({ pinned, top, left, maxHeight });
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(header);
      window.addEventListener('resize', measure);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', measure);
      };
    }, [sessionId, open, userPinned]);

    useEffect(() => {
      if (layout.pinned) setOpen(false);
    }, [layout.pinned]);

    useEffect(() => {
      if (!open || layout.pinned || typeof document === 'undefined') return;
      const onPointer = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (!anchorRef.current?.contains(target) && !target?.closest('.dsh-ov-portal')) setOpen(false);
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false);
      };
      document.addEventListener('pointerdown', onPointer);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('pointerdown', onPointer);
        document.removeEventListener('keydown', onKey);
      };
    }, [open, layout.pinned]);

    useEffect(() => {
      const sessions = sessionsRef.current;
      if (!sessions?.list) {
        setSubagents([]);
        setSubagentSummaries({});
        return;
      }
      const sync = () => {
        const snap = sessions.list.getSnapshot();
        const proj = snap?.projectionsBySession?.[sessionId];
        const catalog = proj?.state === 'ready' ? proj.values?.subagentCatalog : undefined;
        const list = Array.isArray(catalog) ? catalog : [];
        setSubagents(list);
        setSubagentSummaries(snap?.byId ?? {});
        for (const entry of list) {
          if (entry?.id && !snap?.byId?.[entry.id]?.projectionValues?.tokenUsage && entry.mode !== 'external') {
            void sessions.refreshProjections?.(entry.id);
          }
        }
      };
      sync();
      if (sessions.list.getSnapshot()?.projectionsBySession?.[sessionId]?.state !== 'ready') {
        void sessions.refreshProjections?.(sessionId);
      }
      const off = sessions.list.subscribe?.(sync);
      return () => off?.();
    }, [sessionId, svcVer]);

    useEffect(() => {
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

    useEffect(() => {
      if (hovered?.kind !== 'job') return;
      const jobsSvc = jobsRef.current;
      const job = jobs.find((j) => String(j.id) === hovered.id);
      if (!jobsSvc?.observe || !job) return;
      return jobsSvc.observe(sessionId, job.id);
    }, [sessionId, hovered?.kind, hovered?.id, jobs]);

    useEffect(() => {
      if (!open) setHovered(null);
    }, [open]);

    const visibleJobs = jobs.filter((j) => !dismissedJobIds.includes(String(j.id)));

    const showHover = (
      event: React.MouseEvent<HTMLElement>,
      info: {
        kind: 'job' | 'subagent';
        id: string;
        title: string;
        sub: string;
        tokens?: string;
        duration?: string;
        dotState?: 'done' | 'ongoing' | 'idle';
        jobKind?: string;
        jobStatusText?: string;
      },
    ) => {
      cancelHoverClose();
      const cardRect = cardRef.current?.getBoundingClientRect();
      const rowRect = event.currentTarget.getBoundingClientRect();
      const topPx = Math.round(Math.max(12, Math.min(rowRect.top, window.innerHeight - 240)));
      if (layout.pinned) {
        const leftPx = Math.round((cardRect?.right ?? rowRect.right) + 8);
        setHovered({ ...info, top: topPx, left: leftPx });
      } else {
        const rightPx = Math.round(window.innerWidth - (cardRect?.left ?? rowRect.left) + 8);
        setHovered({ ...info, top: topPx, right: rightPx });
      }
    };

    const activeTodos = prefs.enableTodos ? todos : [];
    const activeSubagents = prefs.enableSubagents ? subagents : [];
    const activeJobs = prefs.enableJobs ? visibleJobs : [];
    const activeInputs = prefs.enableInputs ? inputs : [];
    const activeBookmarks = prefs.enablePresentBookmarks ? bookmarks : [];

    const currentCounts: Record<string, number> = {
      'builtin:subagents': activeSubagents.length,
      'builtin:jobs': activeJobs.length,
      'builtin:inputs': activeInputs.length,
      'builtin:present': activeBookmarks.length,
    };
    for (const sec of sections) {
      if (sec.trackDelta) {
        const b = typeof sec.badge === 'function' ? sec.badge(sessionId) : sec.badge;
        if (typeof b === 'number' && Number.isFinite(b)) currentCounts[sec.id] = b;
      }
    }

    useEffect(() => {
      if (open || layout.pinned) {
        if (!hasOpenedOnceRef.current) {
          hasOpenedOnceRef.current = true;
          setOpenBaseline({ ...currentCounts });
        } else {
          setOpenBaseline({ ...lastSeenCountsRef.current });
        }
      } else if (hasOpenedOnceRef.current) {
        lastSeenCountsRef.current = { ...currentCounts };
      }
    }, [open, layout.pinned]);

    const deltaFor = (id: string, count: number): number => {
      if (!prefs.enableDelta || !Object.prototype.hasOwnProperty.call(openBaseline, id)) return 0;
      return count - openBaseline[id];
    };

    const hasContent =
      actions.length > 0 ||
      sections.length > 0 ||
      activeTodos.length > 0 ||
      activeBookmarks.length > 0 ||
      activeInputs.length > 0 ||
      activeSubagents.length > 0 ||
      activeJobs.length > 0;
    const tr = (k: string, fallback: string) => {
      const res = t?.(k);
      return res && res !== k ? res : fallback;
    };

    const card =
      hasContent && (layout.pinned || open) ? (
        <div
          className={`dsh-ov-portal${isGliding ? ' is-gliding' : ''}`}
          style={{ position: 'fixed', top: layout.top, left: layout.left, zIndex: 45 }}
        >
          <aside
            ref={cardRef}
            className={`dsh-ov-card${layout.pinned ? ' is-pinned' : ' is-popover'}`}
            style={{ maxHeight: layout.maxHeight }}
            aria-label={tr('title', '会话总览')}
            onMouseEnter={cancelHoverClose}
            onMouseLeave={scheduleHoverClose}
          >
            <div className="dsh-ov-head">
              <span className="dsh-ov-title">{tr('title', '会话总览')}</span>
              <button
                type="button"
                className="dsh-ov-pin-btn"
                aria-pressed={userPinned}
                aria-label={userPinned ? 'Unpin' : 'Pin'}
                title={userPinned ? (hasRoom ? '取消固定' : '已固定（空间不足时自动隐藏）') : '固定总览'}
                onClick={() => {
                  const next = !userPinned;
                  setUserPinned(next);
                  try {
                    if (next) window.localStorage.setItem(pinKey, '1');
                    else window.localStorage.removeItem(pinKey);
                  } catch {
                    // ignore storage errors
                  }
                  if (glideTimerRef.current) clearTimeout(glideTimerRef.current);
                  setIsGliding(true);
                  glideTimerRef.current = setTimeout(() => setIsGliding(false), 420);
                  setOpen(!next);
                }}
              >
                <PinIcon pinned={userPinned} />
              </button>
            </div>

            <div className="dsh-ov-body">
            {actions.length > 0 && (
              <div className="dsh-ov-actions" onMouseEnter={clearHoverNow}>
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="dsh-ov-action"
                    disabled={action.disabled}
                    onClick={() => {
                      action.onClick(sessionId);
                      setOpen(false);
                    }}
                  >
                    {action.icon ? (
                      <span className="dsh-ov-action-icon">
                        {(typeof action.icon === 'function' ? action.icon() : action.icon) as React.ReactNode}
                      </span>
                    ) : null}
                    <span className="dsh-ov-action-label">{action.label}</span>
                    {action.badge !== undefined && action.badge !== '' && (
                      <span className="dsh-ov-action-badge">{action.badge}</span>
                    )}
                    <span className="dsh-ov-chevron" aria-hidden="true">
                      <IconChevronRightOutlineRegular />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {sections.map((section) => {
              const badgeVal = typeof section.badge === 'function' ? section.badge(sessionId) : section.badge;
              const delta =
                section.trackDelta && typeof badgeVal === 'number' ? deltaFor(section.id, badgeVal) : undefined;
              return (
                <OverviewSectionBox
                  key={section.id}
                  section={section}
                  sessionId={sessionId}
                  renderSlot={renderSlot}
                  openState={isSectionOpen(section.id, section.defaultOpen !== false)}
                  onToggleOpen={(next) => toggleSection(section.id, next)}
                  delta={delta}
                  onHeaderEnter={clearHoverNow}
                />
              );
            })}

            {activeTodos.length > 0 && (
              <OverviewSectionBox
                openState={isSectionOpen('builtin:todos', sections.length === 0)}
                onToggleOpen={(next) => toggleSection('builtin:todos', next)}
                onHeaderEnter={clearHoverNow}
                section={{
                  id: 'builtin:todos',
                  title: tr('todosTitle', '待办'),
                  badge: `${activeTodos.filter((item) => item.status === 'completed').length}/${activeTodos.length}`,
                  defaultOpen: sections.length === 0,
                  render: () => (
                    <ul className="dsh-ov-list" onMouseEnter={clearHoverNow}>
                      {activeTodos.map((item, idx) => (
                        <OverviewItem
                          key={`${idx}:${item.content}`}
                          icon={<StateDot state={todoDotState(item.status)} />}
                          label={item.content}
                          muted={item.status === 'completed'}
                        />
                      ))}
                    </ul>
                  ),
                }}
                sessionId={sessionId}
              />
            )}

            {activeInputs.length > 0 && (
              <OverviewSectionBox
                openState={isSectionOpen('builtin:inputs', sections.length === 0 && activeBookmarks.length === 0)}
                onToggleOpen={(next) => toggleSection('builtin:inputs', next)}
                delta={deltaFor('builtin:inputs', activeInputs.length)}
                onHeaderEnter={clearHoverNow}
                section={{
                  id: 'builtin:inputs',
                  title: tr('inputsTitle', '输入材料'),
                  badge: activeInputs.length,
                  defaultOpen: sections.length === 0 && activeBookmarks.length === 0,
                  render: () => (
                    <ul className="dsh-ov-list" onMouseEnter={clearHoverNow}>
                      {activeInputs.map((item) => (
                        <OverviewItem
                          key={item.key}
                          icon={<FileTypeIcon kind={classifyFileType(item.label)} size={16} />}
                          label={item.label}
                          onClick={
                            item.element
                              ? () => {
                                  item.element?.click();
                                  item.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  setOpen(false);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </ul>
                  ),
                }}
                sessionId={sessionId}
              />
            )}

            {activeSubagents.length > 0 && (
              <OverviewSectionBox
                openState={isSectionOpen('builtin:subagents', false)}
                onToggleOpen={(next) => toggleSection('builtin:subagents', next)}
                delta={deltaFor('builtin:subagents', activeSubagents.length)}
                onHeaderEnter={clearHoverNow}
                section={{
                  id: 'builtin:subagents',
                  title: tr('subagentsTitle', '子智能体'),
                  badge: activeSubagents.length,
                  defaultOpen: false,
                  render: () => (
                    <ul className="dsh-ov-list">
                      {activeSubagents.map((agent, idx) => {
                        const summary = subagentSummaries[agent.id];
                        const title = String(agent.label || summary?.title || agent.name || agent.id || `#${idx + 1}`);
                        const sub = String(agent.name || agent.mode || '');
                        const tokens = formatCompactTokens(summary?.projectionValues?.tokenUsage);
                        const durMs = subagentDurationMs(summary, agent.activity);
                        const duration = formatDurationMs(durMs);
                        const state: 'done' | 'ongoing' | 'idle' =
                          agent.activity === 'running'
                            ? 'ongoing'
                            : agent.mode !== 'external' &&
                                (agent.activity === 'inactive' || summary?.projectionValues?.tokenUsage != null || summary != null)
                              ? 'done'
                              : 'idle';
                        const address = {
                          parentSessionId: sessionId,
                          childSessionId: agent.id,
                          mode: agent.mode,
                        };
                        return (
                          <OverviewItem
                            key={String(agent.id ?? idx)}
                            icon={<StateDot state={state} />}
                            label={sub || title}
                            onMouseEnter={(e) =>
                              showHover(e, {
                                kind: 'subagent',
                                id: String(agent.id ?? idx),
                                title,
                                sub: sub !== title ? sub : '',
                                tokens,
                                duration,
                                dotState: state,
                              })
                            }
                            onMouseLeave={scheduleHoverClose}
                            onClick={() => {
                              if (sidebarRightRef.current?.openResource && agent.mode) {
                                const q = new URLSearchParams({ parent: sessionId, mode: agent.mode });
                                sidebarRightRef.current.openResource(
                                  `dsh-resource://subagentchat/session/${encodeURIComponent(agent.id)}?${q}`,
                                  { kind: 'subagentchat', preferNewPane: true },
                                );
                              } else {
                                workspaceRef.current?.openSession?.(address);
                              }
                              setOpen(false);
                            }}
                          />
                        );
                      })}
                    </ul>
                  ),
                }}
                sessionId={sessionId}
              />
            )}

            {activeJobs.length > 0 && (
              <OverviewSectionBox
                openState={isSectionOpen('builtin:jobs', false)}
                onToggleOpen={(next) => toggleSection('builtin:jobs', next)}
                delta={deltaFor('builtin:jobs', activeJobs.length)}
                onHeaderEnter={clearHoverNow}
                section={{
                  id: 'builtin:jobs',
                  title: tr('jobsTitle', '后台任务'),
                  badge: activeJobs.length,
                  defaultOpen: false,
                  render: () => (
                    <ul className="dsh-ov-list">
                      {activeJobs.map((job, idx) => {
                        const idKey = String(job.id ?? idx);
                        const label = String(job.label || job.command || job.title || idKey);
                        const rawDetail = job.progress ?? job.detail;
                        const detail = typeof rawDetail === 'string' || typeof rawDetail === 'number' ? String(rawDetail) : '';
                        const live = job.status === 'running' || job.status === 'stopping';
                        const state: 'done' | 'ongoing' | 'idle' = live
                          ? 'ongoing'
                          : job.status === 'succeeded' || job.status === 'done' || job.status === 'exited' || job.status === 'completed'
                            ? 'done'
                            : 'idle';
                        const elapsed =
                          job.startedAt && (live || job.finishedAt)
                            ? formatDurationMs((live ? Date.now() : Number(job.finishedAt)) - Number(job.startedAt))
                            : '';
                        const statusText = [detail || job.status, elapsed].filter(Boolean).join('  ');
                        return (
                          <OverviewItem
                            key={idKey}
                            icon={<StateDot state={state} />}
                            label={label}
                            onMouseEnter={(e) =>
                              showHover(e, {
                                kind: 'job',
                                id: idKey,
                                title: label,
                                sub: '',
                                dotState: state,
                                jobKind: String(job.kind ?? ''),
                                jobStatusText: statusText,
                              })
                            }
                            onMouseLeave={scheduleHoverClose}
                            onClick={() => {
                              setActiveJobPreview({ sessionId, job });
                              sidebarRightRef.current?.openTab?.(JOB_TAB_KIND);
                              setOpen(false);
                            }}
                            action={{
                              icon: live ? <IconStopFillRegular /> : <IconTrashOutlineRegular />,
                              label: live ? 'Stop' : 'Remove',
                              title: live ? '停止任务' : '移除记录',
                              onClick: () => {
                                if (live) {
                                  void jobsRef.current?.kill?.(sessionId, job.id);
                                } else {
                                  setDismissedJobIds((prev) => (prev.includes(idKey) ? prev : [...prev, idKey]));
                                  if (hovered?.id === idKey) setHovered(null);
                                }
                              },
                            }}
                          />
                        );
                      })}
                    </ul>
                  ),
                }}
                sessionId={sessionId}
              />
            )}

            {activeBookmarks.length > 0 && (
              <OverviewSectionBox
                openState={isSectionOpen('builtin:present', sections.length === 0)}
                onToggleOpen={(next) => toggleSection('builtin:present', next)}
                delta={deltaFor('builtin:present', activeBookmarks.length)}
                onHeaderEnter={clearHoverNow}
                section={{
                  id: 'builtin:present',
                  title: tr('presentTitle', '关键产出'),
                  badge: activeBookmarks.length,
                  defaultOpen: sections.length === 0,
                  render: () => (
                    <ul className="dsh-ov-list" onMouseEnter={clearHoverNow}>
                      {activeBookmarks.map((bm) => (
                        <OverviewItem
                          key={bm.key}
                          icon={<FileTypeIcon kind={classifyFileType(bm.label)} size={16} />}
                          label={bm.label}
                          title={bm.path}
                          onClick={() => {
                            openPresentBookmark(bm, sessionId, sidebarRightRef.current);
                            setOpen(false);
                          }}
                        />
                      ))}
                    </ul>
                  ),
                }}
                sessionId={sessionId}
              />
            )}
            </div>
          </aside>
        </div>
      ) : null;

    return (
      <div className="dsh-ov-anchor" ref={anchorRef} hidden={!hasContent}>
        {hasContent && !layout.pinned && (
          <Tooltip label={tr('trigger', '总览')} side="bottom" align="end" portal>
            <Button
              size="sm"
              variant="ghost"
              className="dsh-ov-trigger-btn"
              aria-label={tr('trigger', '总览')}
              aria-expanded={open}
              aria-haspopup="menu"
              icon={<IconBrowseOutlineRegular />}
              onClick={() => setOpen((v) => !v)}
            >
              {badge && (
                <span className="dsh-ov-trigger-dot-wrap" data-tone={badge.tone} aria-hidden="true">
                  <span className="dsh-ov-trigger-dot" />
                </span>
              )}
            </Button>
          </Tooltip>
        )}
        {card &&
          (typeof document !== 'undefined' && typeof createPortal === 'function'
            ? createPortal(card, document.body)
            : card)}
        {hovered &&
          (open || layout.pinned) &&
          typeof document !== 'undefined' &&
          typeof createPortal === 'function' &&
          createPortal(
            <div
              className="dsh-ov-portal"
              style={{
                position: 'fixed',
                top: hovered.top,
                ...(hovered.left !== undefined ? { left: hovered.left } : { right: hovered.right }),
                zIndex: 46,
              }}
              onMouseEnter={cancelHoverClose}
              onMouseLeave={scheduleHoverClose}
            >
              {hovered.kind === 'subagent' ? (
                <div className="dsh-ov-hover-card dsh-ov-hover-subagent">
                  <span className="dsh-ov-todo-glyph" aria-hidden="true">
                    <StateDot state={hovered.dotState ?? 'idle'} />
                  </span>
                  <div className="dsh-ov-hover-sub-main">
                    <div className="dsh-ov-hover-title">{hovered.title}</div>
                    {hovered.sub && <div className="dsh-ov-hover-sub">{hovered.sub}</div>}
                  </div>
                  {(hovered.tokens || hovered.duration) && (
                    <div className="dsh-ov-hover-metrics">
                      {hovered.tokens && <span>{hovered.tokens}</span>}
                      {hovered.duration && <span>{hovered.duration}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="dsh-ov-hover-card dsh-ov-hover-job">
                  {(() => {
                    const obs = observedJobs[hovered.id];
                    const tail = obs?.text ?? obs?.output?.tail ?? obs?.tail ?? '';
                    return <OverviewTerminalView command={hovered.title} output={tail} />;
                  })()}
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  function TodoProjectionBridge({
    sessionId,
    useProjection,
  }: {
    sessionId: string;
    useProjection?: (key: string) => unknown;
  }) {
    const projected = useProjection?.('todos');
    const list = Array.isArray(projected) ? projected : [];
    useEffect(() => {
      if (sessionId) registry.setSessionTodos(sessionId, list);
    }, [sessionId, list]);
    return null;
  }

  slots.inject('conversation.input.dock', () =>
    slots.register(
      {
        name: 'conversation.input.dock',
        id: 'dsh-overview.todo-bridge',
        order: 999,
      },
      TodoProjectionBridge,
    ),
  );

  slots.inject('conversation.session.header.utilities', () =>
    slots.register(
      {
        name: 'conversation.session.header.utilities',
        id: 'dsh-overview.trigger',
        order: 10,
        locale: NS,
        children: {
          'overview.action': { kind: 'list', scope: 'session' },
          'overview.section': { kind: 'list', scope: 'session' },
          'overview.trigger.badge': { kind: 'list', scope: 'session' },
        },
      },
      OverviewTrigger,
    ),
  );
}

export default {
  name: 'dsh-overview-client',
  inject: ['slots', 'locale'],
  apply,
};
