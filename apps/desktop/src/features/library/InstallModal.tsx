import { useState } from "react";
import { createPortal } from "react-dom";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import buttons from "../../styles/_buttons.module.css";
import forms from "../../styles/_forms.module.css";
import { agentLabel, copy, type Language } from "../../i18n";
import type { AgentKind, SkillItem } from "../../types";
import { installSkillToDefault, installSkillToTarget } from "../../api/library";
import styles from "./InstallModal.module.css";

type InstallModalProps = {
  skill: SkillItem;
  language: Language;
  onClose: () => void;
  onResult: (success: boolean, message: string) => void;
};

const ALL_AGENTS: AgentKind[] = ["codex", "claude_code", "agent", "open_claw"];

export function InstallModal({ skill, language, onClose, onResult }: InstallModalProps) {
  const text = copy[language];
  const [showCustom, setShowCustom] = useState(false);
  const [path, setPath] = useState("");
  const [agents, setAgents] = useState<AgentKind[]>([skill.agent]);
  const [method, setMethod] = useState<"symlink" | "copy">("symlink");
  const [busy, setBusy] = useState(false);

  async function handleSelectFolder() {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setPath(selected);
      }
    } catch {
      // Dialog can be blocked in some sandboxed environments — safe to ignore
    }
  }

  async function handleQuickInstall(agent: AgentKind) {
    setBusy(true);
    try {
      await installSkillToDefault(skill.path, agent, "symlink");
      onResult(true, text.installSuccess);
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      onResult(false, `${agentLabel(agent)}: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCustomConfirm() {
    if (!path.trim() || agents.length === 0) return;
    setBusy(true);
    const errors: string[] = [];
    for (const agent of agents) {
      try {
        await installSkillToTarget(skill.path, path.trim(), agent, method);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${agentLabel(agent)}: ${message}`);
      }
    }
    setBusy(false);
    if (errors.length === 0) {
      onResult(true, text.installSuccess);
      onClose();
    } else {
      onResult(false, `${text.installFailed}\n${errors.join("\n")}`);
    }
  }

  const content = (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.dialogHeader}>
          <p className={styles.dialogTitle}>{skill.display_name}</p>
          <p className={styles.dialogSubtitle}>{text.installQuickTitle}</p>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.quickGrid}>
            {ALL_AGENTS.map((a) => (
              <button
                key={a}
                type="button"
                disabled={busy}
                className={styles.quickButton}
                onClick={() => void handleQuickInstall(a)}
              >
                {text.installQuickGlobal.replace("{agent}", agentLabel(a))}
              </button>
            ))}
          </div>

          <div className={styles.customSection}>
            <button
              type="button"
              className={styles.toggleCustomLink}
              onClick={() => setShowCustom((v) => !v)}
            >
              {showCustom ? "−" : "+"} {text.customInstallTitle}
            </button>

            {showCustom ? (
              <div className={styles.customPanel}>
                <div className={styles.formRow}>
                  <input
                    type="text"
                    className={forms.searchField}
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder={text.customTargetPath}
                  />
                  <button
                    type="button"
                    className={buttons.secondaryButton}
                    onClick={() => void handleSelectFolder()}
                  >
                    {text.selectFolder}
                  </button>
                </div>

                <div className={styles.fieldGroup}>
                  <p className={styles.fieldLabel}>{text.customInstallAgent}</p>
                  <div className={styles.toggleGroup}>
                    {ALL_AGENTS.map((a) => (
                      <AgentToggleButton
                        key={a}
                        active={agents.includes(a)}
                        label={agentLabel(a)}
                        onClick={() =>
                          setAgents((prev) =>
                            prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                          )
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <p className={styles.fieldLabel}>{text.customInstallMethod}</p>
                  <div className={styles.toggleGroup}>
                    <AgentToggleButton
                      active={method === "symlink"}
                      label={text.installMethodSymlink}
                      onClick={() => setMethod("symlink")}
                    />
                    <AgentToggleButton
                      active={method === "copy"}
                      label={text.installMethodCopy}
                      onClick={() => setMethod("copy")}
                    />
                  </div>
                </div>

                <div className={styles.dialogFooter}>
                  <button
                    type="button"
                    className={buttons.secondaryButton}
                    onClick={onClose}
                    disabled={busy}
                  >
                    {text.cancelVariantLabel}
                  </button>
                  <button
                    type="button"
                    className={buttons.primaryButton}
                    disabled={!path.trim() || agents.length === 0 || busy}
                    onClick={() => void handleCustomConfirm()}
                  >
                    {busy ? text.installingLabel : text.customInstallConfirm}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {!showCustom ? (
          <div className={styles.dialogFooter}>
            <button
              type="button"
              className={buttons.secondaryButton}
              onClick={onClose}
              disabled={busy}
            >
              {text.cancelVariantLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function AgentToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? styles.toggleButtonActive : styles.toggleButton}
    >
      {label}
    </button>
  );
}
