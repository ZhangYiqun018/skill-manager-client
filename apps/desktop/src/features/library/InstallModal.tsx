import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import styles from "../../App.module.css";
import { agentLabel, copy, type Language } from "../../i18n";
import type { AgentKind, SkillItem } from "../../types";

type InstallModalProps = {
  skill: SkillItem;
  language: Language;
  onClose: () => void;
  onInstall: (
    path: string,
    agents: AgentKind[],
    method: "symlink" | "copy",
  ) => Promise<void>;
};

const ALL_AGENTS: AgentKind[] = ["codex", "claude_code", "agent"];

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
      // Some environments block the dialog; ignore
    }
  }

  function toggleAgent(agent: AgentKind) {
    setAgents((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent],
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--sm-surface)",
          border: "1px solid var(--sm-border)",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        <p className={styles.sectionLabel} style={{ marginBottom: 6 }}>
          {text.customInstallTitle}
        </p>
        <p className={styles.helperText} style={{ marginBottom: 16 }}>
          {skill.display_name}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              className={styles.searchField}
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={text.customTargetPath}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleSelectFolder()}
            >
              {text.selectFolder}
            </button>
          </div>

          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--sm-text-secondary)", marginBottom: 6 }}>
              {text.customInstallAgent}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--sm-text-secondary)", marginBottom: 6 }}>
              {text.customInstallMethod}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <AgentToggleButton active={method === "symlink"} label={text.installMethodSymlink} onClick={() => setMethod("symlink")} />
              <AgentToggleButton active={method === "copy"} label={text.installMethodCopy} onClick={() => setMethod("copy")} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>
            {text.cancelVariantLabel}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
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
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: active ? "1px solid var(--sm-primary)" : "1px solid var(--sm-border)",
        background: active ? "var(--sm-primary)" : "var(--sm-surface-hover)",
        color: active ? "#ffffff" : "var(--sm-text)",
        fontWeight: 600,
        fontSize: "0.9rem",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
