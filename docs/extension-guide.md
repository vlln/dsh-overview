# 插件扩展指南

`@vlln/dsh-overview` 同时提供 **DSH 子插槽** 与 **`ctx.get('overview')` 服务**，推荐优先使用子插槽，确保未安装 `dsh-overview` 时业务插件仍可正常加载。

## 1. 扩展点一览

### `overview.action`（顶部快捷入口，不折叠）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 唯一标识 |
| `label` | `string` | 是 | 显示文案 |
| `order` | `number` | 否 | 排序权重（默认 `100`） |
| `icon` | `ReactNode \| (() => ReactNode)` | 否 | 推荐传函数以延迟求值 JSX |
| `badge` | `string \| number` | 否 | 右侧计数/短标签 |
| `disabled` | `boolean` | 否 | 是否禁用 |
| `visible` | `(sessionId: string) => boolean` | 否 | 按会话控制显隐 |
| `onClick` | `(sessionId: string) => void` | 是 | 点击回调 |

### `overview.section`（主体可折叠分组）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 唯一标识 |
| `title` | `string` | 是 | 分组标题 |
| `order` | `number` | 否 | 排序权重（默认 `100`） |
| `badge` | `string \| number \| ((sessionId) => ...)` | 否 | 标题旁计数徽标 |
| `trackDelta` | `boolean` | 否 | 为 `true` 且 `badge` 为数字时，显示相对上次打开的 `+x` / `-x` |
| `defaultOpen` | `boolean` | 否 | 默认是否展开（默认 `true`） |
| `visible` | `(sessionId: string) => boolean` | 否 | 按会话控制显隐 |
| `render` | `(sessionId: string) => ReactNode` | 是 | 分组内容渲染函数 |

### `overview.trigger.badge`（右上角按钮状态点）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 唯一标识 |
| `priority` | `number` | 否 | 优先级（高者胜出，默认 `0`） |
| `tone` | `'neutral' \| 'attention' \| 'done'` | 否 | 状态点颜色 |
| `visible` | `(sessionId: string) => boolean` | 否 | 按会话控制显隐 |

## 2. 复用统一行原语 `OverviewItem`

```tsx
import { OverviewItem } from '@vlln/dsh-overview/client';

<ul className="dsh-ov-list">
  <OverviewItem
    icon={<MyIcon />}
    label="目标与结果"
    onClick={() => openTargets()}
  />
</ul>
```
