export type OverviewTone = 'neutral' | 'attention' | 'done';

export interface OverviewActionSpec {
  id: string;
  order?: number;
  label: string;
  icon?: unknown;
  badge?: string | number;
  disabled?: boolean;
  visible?: (sessionId: string) => boolean;
  onClick: (sessionId: string) => void;
}

export interface OverviewSectionSpec {
  id: string;
  order?: number;
  title: string;
  badge?: string | number | ((sessionId: string) => string | number | undefined);
  trackDelta?: boolean;
  defaultOpen?: boolean;
  visible?: (sessionId: string) => boolean;
  render: (sessionId: string) => unknown;
}

export interface OverviewBadgeSpec {
  id: string;
  priority?: number;
  tone?: OverviewTone;
  text?: string | ((sessionId: string) => string | undefined);
  visible?: (sessionId: string) => boolean;
}

export interface OverviewTodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
}

export interface OverviewPreferences {
  displayMode: 'popover' | 'auto-dock';
  enableTodos: boolean;
  enableSubagents: boolean;
  enableJobs: boolean;
  enableInputs: boolean;
  enablePresentBookmarks: boolean;
  enableDelta: boolean;
}

const DEFAULT_PREFS: OverviewPreferences = {
  displayMode: 'popover',
  enableTodos: true,
  enableSubagents: true,
  enableJobs: true,
  enableInputs: true,
  enablePresentBookmarks: true,
  enableDelta: true,
};

const sortByOrder = <T extends { id: string; order?: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));

export class OverviewRegistry {
  private actions = new Map<string, OverviewActionSpec>();
  private sections = new Map<string, OverviewSectionSpec>();
  private badges = new Map<string, OverviewBadgeSpec>();
  private sessionTodos = new Map<string, OverviewTodoItem[]>();
  private listeners = new Set<() => void>();
  private prefs: OverviewPreferences = { ...DEFAULT_PREFS };
  private version = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = (): number => this.version;

  getPreferences = (): OverviewPreferences => this.prefs;

  setPreferences(patch: Partial<OverviewPreferences>): void {
    this.prefs = { ...this.prefs, ...patch };
    this.emit();
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  registerAction(spec: OverviewActionSpec): () => void {
    this.actions.set(spec.id, spec);
    this.emit();
    return () => {
      if (this.actions.get(spec.id) === spec) {
        this.actions.delete(spec.id);
        this.emit();
      }
    };
  }

  registerSection(spec: OverviewSectionSpec): () => void {
    this.sections.set(spec.id, spec);
    this.emit();
    return () => {
      if (this.sections.get(spec.id) === spec) {
        this.sections.delete(spec.id);
        this.emit();
      }
    };
  }

  registerBadge(spec: OverviewBadgeSpec): () => void {
    this.badges.set(spec.id, spec);
    this.emit();
    return () => {
      if (this.badges.get(spec.id) === spec) {
        this.badges.delete(spec.id);
        this.emit();
      }
    };
  }

  getActions(sessionId: string): OverviewActionSpec[] {
    return sortByOrder(
      [...this.actions.values()].filter((item) => !item.visible || item.visible(sessionId)),
    );
  }

  getSections(sessionId: string): OverviewSectionSpec[] {
    return sortByOrder(
      [...this.sections.values()].filter((item) => !item.visible || item.visible(sessionId)),
    );
  }

  getActiveBadge(sessionId: string): { tone: OverviewTone; text?: string } | null {
    const visible = [...this.badges.values()]
      .filter((item) => !item.visible || item.visible(sessionId))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id));
    const top = visible[0];
    if (!top) return null;
    const text = typeof top.text === 'function' ? top.text(sessionId) : top.text;
    return { tone: top.tone ?? 'neutral', text };
  }

  setSessionTodos(sessionId: string, todos: readonly OverviewTodoItem[]): void {
    const prev = this.sessionTodos.get(sessionId) ?? [];
    if (
      prev.length === todos.length &&
      prev.every((item, i) => item.content === todos[i]?.content && item.status === todos[i]?.status)
    ) {
      return;
    }
    this.sessionTodos.set(sessionId, [...todos]);
    this.emit();
  }

  getSessionTodos(sessionId: string): OverviewTodoItem[] {
    return this.sessionTodos.get(sessionId) ?? [];
  }
}
