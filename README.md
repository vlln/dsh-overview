<h1 align="center">dsh-overview</h1>

<p align="center"><b>DSH 通用会话总览容器插件——集中收口待办、子智能体、后台任务、输入材料与关键产出，并向其他插件开放扩展插槽。</b></p>

<p align="center">
  <a href="#功能一览">功能一览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#插件扩展">插件扩展</a> ·
  <a href="docs/architecture.md">架构文档</a> ·
  <a href="docs/extension-guide.md">扩展指南</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vlln/dsh-overview"><img src="https://img.shields.io/npm/v/%40vlln%2Fdsh-overview" alt="npm version"></a>
  <img src="https://img.shields.io/badge/dsh-%3E%3D0.1.0--rc.5-informational" alt="dsh >=0.1.0-rc.5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

<br>

## 演示

https://github.com/user-attachments/assets/14a5dd23-b33f-439a-8257-19be1b330c0a

<br>

## 功能一览

| 模块 | 能力 | 交互 |
|---|---|---|
| **待办（To-dos）** | 自动同步会话 `todos` 投影与完成进度 | 复用 DSH `StateDot` 展示待办 / 进行中 / 已完成 |
| **子智能体（Subagents）** | 自动拉取并订阅 `subagentCatalog` | Hover 左侧浮出详情卡（摘要、Token、耗时）；点击在右侧栏打开 |
| **后台任务（Background Tasks）** | 单行紧凑列表，Hover 显示停止或移除按钮 | Hover 左侧浮出终端预览（语法着色、换行折叠、图标复制）；点击在右侧栏打开完整输出 |
| **输入材料（Inputs）** | 汇总会话上传文件并跨刷新缓存 | 配官方 `FileTypeIcon`，点击定位消息附件 |
| **关键产出（Deliverables）** | 汇总 `present` 交付文件（含 >4 个折叠条目）、自动去重并跨刷新缓存 | 配官方 `FileTypeIcon`，点击直接在右侧栏打开预览 |

- **增量变化提示（`+x` / `-x`）**：列表计数类分组反映自上次打开总览后的新增或减少。
- **Pin 固定停靠与自适应避让**：点击卡片右上角图钉可按会话持久化固定；固定后卡片平滑滑入对话区左上角，彻底避开右侧官方导航条；当窗口变窄或与消息流碰撞时自动隐藏，空间恢复后自动重现。
- **固定标题栏与插件开关**：滚动内容时标题栏保持置顶并带虚化分界线，高度自适应至对话区下边缘；可在侧边栏「插件」→ `@vlln/dsh-overview` 详情页按需开关各内置模块与增量标记。
- 当前会话无任何内容时触发按钮自动隐身，不占用页头空间。

<br>

## 快速开始

**前置条件**：Node.js `>=22.19.0`，已安装 `dsh`（`>=0.1.0-rc.5`）。

```bash
# 通过 DSH 插件管理安装（推荐）
dsh plugin --profile web add @vlln/dsh-overview

# 或作为 npm 依赖安装（供其他插件引入类型/工具）
npm install @vlln/dsh-overview
```

本地源码安装验证：

```bash
dsh plugin --profile web add /path/to/dsh-overview
```

<br>

## 插件扩展

外部插件可通过 `slots.inject` 松耦合接入，未安装 `@vlln/dsh-overview` 时不会报错；完整字段说明见 [扩展指南](docs/extension-guide.md)。

<details>
<summary>查看 <code>overview.action</code> / <code>overview.section</code> / <code>overview.trigger.badge</code> 接入示例</summary>

```tsx
slots.inject('overview.action', () =>
  slots.register(
    {
      name: 'overview.action',
      id: 'my-plugin.open',
      order: 10,
      label: '打开结果',
      visible: (sessionId) => hasResult(sessionId),
      onClick: (sessionId) => openResult(sessionId),
    },
    () => null,
  ),
);

slots.inject('overview.section', () =>
  slots.register(
    {
      name: 'overview.section',
      id: 'my-plugin.stages',
      order: 20,
      title: '执行阶段',
      badge: (sessionId) => getCount(sessionId),
      trackDelta: true,
      visible: (sessionId) => hasStages(sessionId),
      render: (sessionId) => <MyStages sessionId={sessionId} />,
    },
    MyStages,
  ),
);
```

</details>

<br>

## 开发与文档

- 源码架构与状态边界：[docs/architecture.md](docs/architecture.md)
- 扩展点与 `OverviewItem` API：[docs/extension-guide.md](docs/extension-guide.md)

```bash
npm run build
npm test
```

## 许可证

[MIT](LICENSE)
