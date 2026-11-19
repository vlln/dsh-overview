// @vlln/dsh-overview Node half：声明插件 Config schema 供宿主 Settings/Plugins 配置面读写。
import z from '@deepseek-ai/schemastery';

export const NAMESPACE = 'dsh-overview';

export const DEFAULTS = Object.freeze({
  enableTodos: true,
  enableSubagents: true,
  enableJobs: true,
  enableInputs: true,
  enablePresentBookmarks: true,
  enableDelta: true,
});

export const Config = z.object({
  enableTodos: z.boolean().default(DEFAULTS.enableTodos).volatile(),
  enableSubagents: z.boolean().default(DEFAULTS.enableSubagents).volatile(),
  enableJobs: z.boolean().default(DEFAULTS.enableJobs).volatile(),
  enableInputs: z.boolean().default(DEFAULTS.enableInputs).volatile(),
  enablePresentBookmarks: z.boolean().default(DEFAULTS.enablePresentBookmarks).volatile(),
  enableDelta: z.boolean().default(DEFAULTS.enableDelta).volatile(),
});

export default function apply() {}
