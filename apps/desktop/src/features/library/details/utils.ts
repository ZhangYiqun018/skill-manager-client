import type { Language } from "../../../i18n";

export function formatTimestamp(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function agentLabelLabel(language: Language) {
  return language === "en" ? "file" : "文件";
}
