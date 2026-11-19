# 架构与维护说明

本文档面向 `@vlln/dsh-overview` 维护者，记录模块划分、宿主依赖策略与易错边界。

## 1. 模块职责

| 文件 | 职责 |
|---|---|
| `src/index.mjs` | Node half 入口：声明 `Config` schema（`@deepseek-ai/schemastery` `.volatile()` 叶字段），供宿主配置面读写 |
| `src/client/registry.ts` | 纯内存 `OverviewRegistry`（动作 / 分组 / 角标 / 偏好 / 会话 Todo 缓存） |
| `src/client/scanners.ts` | 对话 DOM 扫描（`[data-presented-file]` + `[data-tool="present"]` / `[data-message-attachments]`）、`isSamePresentedPath` 去重与 `localStorage` 跨刷新缓存 |
| `src/client/terminal.tsx` | `OverviewTerminalView`（轻量 shell 分词着色、自动换行折叠、图标复制按钮） |
| `src/client/style.ts` | 样式表（全部引用 `--dsw-*` 宿主语义令牌、固定标题栏虚化、Pin 滑行过渡） |
| `src/client/index.tsx` | 容器入口、子插槽桥接、内置分组装配、Plugins 设置卡与右侧栏预览 Tab |

## 2. 宿主服务注入边界

- 顶层 `inject` 仅声明 `['slots', 'locale']`，保证在任意精简 profile 下都能挂载。
- `sessions`、`uiWorkspace`、`jobs`、`sidebarRight`、`sidebarRightTabs`、`configForms` 均通过 `ctx.inject([...], ...)` **可选子作用域**注入，并配合 `svcVer`（`useSyncExternalStore`）在服务晚到时自动重订阅，避免时序竞态。
- `tsdown.config.ts` 会将 `@deepseek-ai/dsh` 自带的 `@deepseek-ai/schemastery` fork 直接打入 `lib/index.mjs`，避免本地 `link:` 安装时 Node ESM 找不到宿主内部依赖。

## 3. 关键状态机制

- **分组折叠记忆**：`sectionOpenMap` 保存在 `OverviewTrigger` 组件状态中，仅在当前会话页面生命周期内记忆，不写 `localStorage`。
- **增量变化（`+x` / `-x`）**：通过 `hasOpenedOnceRef` 区分“首次打开总览”与“后续再次打开”；首次打开直接以当前数量作为基线，防止页面刷新后误报 `+n`。
- **跨刷新持久化缓存**：`dsh-overview:v1:present:<sessionId>` 与 `dsh-overview:v1:inputs:<sessionId>` 存入 `localStorage`，解决 DSH 历史分页懒加载导致刷新后早期文件不可见的问题；同时扫描 `[data-tool="present"]` 补全超过 4 个被折叠的交付物并按相对/绝对路径去重。
- **Pin 固定与空间自适应**：`dsh-overview:v1:pinned:<sessionId>` 按会话持久化；有足够左侧留白时停靠对话区左上角（避开右侧 `TurnNavigator`），空间不足时自动隐藏且保持 `open = false`，空间恢复后自动重现。
- **插件开关配置**：通过 `plugins.bundle.config`（`key: 'dsh-overview'`）渲染开关卡，同时读写 `localStorage`（`dsh-overview:v1:prefs`）与 `configForms`。
- **右侧栏路由**：`sidebarRightTabs.register` 必须同时提供 `id`（用于 `sidebar.right.pane.tab` 槽位 `key`）和 `kind`（用于 `sidebarRight.openTab(kind)`）。
