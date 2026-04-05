import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import buttons from "../../styles/_buttons.module.css";
import forms from "../../styles/_forms.module.css";
import { agentLabel, copy, type Language } from "../../i18n";
import type { AgentKind, SkillItem } from "../../types";
import styles from "./InstallModal.module.css";

type InstallModalProps = {
  skill: SkillItem;
  language: Language;
  onClose: () => void;
  onInstall: (path: string, agents: AgentKind[], method: "symlink" | "copy") => Promise<void>;
};

const ALL_AGENTS: AgentKind[] = ["codex", "claude_code", "agent", "open_claw"];

export function InstallModal({ skill, language, onClose, onInstall }: InstallModalProps) {
  const text = copy[language];
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

  function toggleAgent(agent: AgentKind) {
    setAgents((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
    );
  }

  async function handleConfirm() {
    if (!path.trim() || agents.length === 0) return;
    setBusy(true);
    try {
      await onInstall(path.trim(), agents, method);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.dialogHeader}>
          <p className={styles.dialogTitle}>{text.customInstallTitle}</p>
          <p className={styles.dialogSubtitle}>{skill.display_name}</p>
        </div>

        <div className={styles.dialogBody}>
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
                  onClick={() => toggleAgent(a)}
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
            onClick={() => void handleConfirm()}
          >
            {busy ? text.installingLabel : text.customInstallConfirm}
          </button>
        </div>
      </div>
    </div>
  );
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
