import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import { FilterPill } from "../../components/FilterPill";
import { agentLabel, copy, scopeLabel, type Language } from "../../i18n";

type SourceConfigProps = {
  agent: "agent" | "codex" | "claude_code";
  language: Language;
  onAgentChange: (value: "agent" | "codex" | "claude_code") => void;
  onScopeChange: (value: "global" | "project") => void;
  scope: "global" | "project";
};

export function SourceConfig({
  agent,
  language,
  onAgentChange,
  onScopeChange,
  scope,
}: SourceConfigProps) {
  const text = copy[language];

  return (
    <div className={layout.sectionStack}>
      <div className={layout.sectionIntro}>
        <p className={layout.sectionLabel}>{text.sourceAgentLabel}</p>
        <div className={forms.pillGroup}>
          <FilterPill
            active={agent === "codex"}
            label={agentLabel("codex")}
            onClick={() => onAgentChange("codex")}
          />
          <FilterPill
            active={agent === "claude_code"}
            label={agentLabel("claude_code")}
            onClick={() => onAgentChange("claude_code")}
          />
          <FilterPill
            active={agent === "agent"}
            label={agentLabel("agent")}
            onClick={() => onAgentChange("agent")}
          />
          <FilterPill
            active={agent === "open_claw"}
            label={agentLabel("open_claw")}
            onClick={() => onAgentChange("open_claw")}
          />
        </div>
      </div>

      <div className={layout.sectionIntro}>
        <p className={layout.sectionLabel}>{text.sourceScopeLabel}</p>
        <div className={forms.pillGroup}>
          <FilterPill
            active={scope === "global"}
            label={scopeLabel("global", language)}
            onClick={() => onScopeChange("global")}
          />
          <FilterPill
            active={scope === "project"}
            label={scopeLabel("project", language)}
            onClick={() => onScopeChange("project")}
          />
        </div>
      </div>
    </div>
  );
}
