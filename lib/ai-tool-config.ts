import { SEED_AI_MODEL_CONFIGS } from "./seed-data";
import type { AiModelConfig } from "./types";

export const GENERAL_AI_TOOLS: AiModelConfig[] = SEED_AI_MODEL_CONFIGS.map(
  ({ id, taskName, priority }) => ({
    id,
    taskName,
    priority,
    primaryModel: "",
    fallbackModel: "",
    isEnabled: false,
    usageCount: 0,
  }),
);

export function getToolConfigKeys(tool: AiModelConfig) {
  return tool.id === "cfg-tutor-chat"
    ? [tool.id, tool.taskName, "chat"]
    : [tool.id, tool.taskName];
}
