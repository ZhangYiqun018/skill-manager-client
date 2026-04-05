import { useState } from "react";
import { createPortal } from "react-dom";
import buttons from "../../styles/_buttons.module.css";
import forms from "../../styles/_forms.module.css";
import panels from "../../styles/_panels.module.css";
import layout from "../../styles/_layout.module.css";
import { agentLabel, copy, type Language } from "../../i18n";
import type { AgentKind, RegistrySkillResult, SkillScope } from "../../types";

type AdoptConfirmDialogProps = {
  skill: RegistrySkillResult;
  language: Language;
  onConfirm: (agent: AgentKind, scope: SkillScope) => Promise<void>;
  onInstallNow: () => void;
  onClose: () => void;
};

type Phase = "confirm" | "adopted";

const AGENTS: AgentKind[] = ["codex", "claude_code", "agent", "open_claw"];
const SCOPES: SkillScope[] = ["global", "project"];

export function AdoptConfirmDialog({
  skill,
  language,
  onConfirm,
  onInstallNow,
  onClose,
}: AdoptConfirmDialogProps) {
  const text = copy[language];
  const [agent, setAgent] = useState<AgentKind>("codex");
  const [scope, setScope] = useState<SkillScope>("global");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(agent, scope);
      setPhase("adopted");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className={panels.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={panels.modalCard}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "confirm" ? (
          <>
            <h3 className={panels.modalTitle}>{text.registryAddToLibrary}</h3>
            <p className={layout.helperText}>
              {skill.name} · {skill.source}
            </p>

            <div className={forms.formGroup}>
              <label className={forms.formLabel}>{text.sourceAgentLabel}</label>
              <div className={forms.pillGroup}>
                {AGENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={agent === a ? buttons.filterPillActive : buttons.filterPill}
                    onClick={() => setAgent(a)}
                  >
                    {agentLabel(a)}
                  </button>
                ))}
              </div>
            </div>

            <div className={forms.formGroup}>
              <label className={forms.formLabel}>{text.sourceScopeLabel}</label>
              <div className={forms.pillGroup}>
                {SCOPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={scope === s ? buttons.filterPillActive : buttons.filterPill}
                    onClick={() => setScope(s)}
                  >
                    {s === "global" ? text.scopeGlobal : text.scopeProject}
                  </button>
                ))}
              </div>
            </div>

            {error ? <p className={panels.errorText}>{error}</p> : null}

            <div className={buttons.actionRow}>
              <button type="button" className={buttons.secondaryButton} onClick={onClose}>
                {text.cancel}
              </button>
              <button
                type="button"
                className={buttons.primaryButton}
                disabled={busy}
                onClick={() => void handleConfirm()}
              >
                {busy ? text.adoptingSkill : text.registryAddToLibrary}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={panels.modalTitle}>{text.registryAdoptedTitle}</h3>
            <p className={layout.helperText}>
              {skill.name} {text.registryAdoptedBody}
            </p>

            <div className={buttons.actionRow}>
              <button type="button" className={buttons.secondaryButton} onClick={onClose}>
                {text.registryLater}
              </button>
              <button type="button" className={buttons.primaryButton} onClick={onInstallNow}>
                {text.registryInstallNow}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
