import styles from "../../../App.module.css";
import {
  agentLabel,
  copy,
  installHealthLabel,
  installMethodLabel,
  scopeLabel,
  type Language,
} from "../../../i18n";
import type { SkillInstallStatus } from "../../../types";
import { formatTimestamp } from "./utils";

type InstallsTabProps = {
  language: Language;
  installsLoading: boolean;
  installsError: string | null;
  installStatuses: SkillInstallStatus[] | null;
  installActionTarget: string | null;
  onShowInstallModal: () => void;
  onRunAction: (
    targetId: string,
    targetRoot: string,
    action: "install" | "remove" | "repair",
  ) => void;
  onOpenPath: (path: string) => void;
};

export function InstallsTab({
  language,
  installsLoading,
  installsError,
  installStatuses,
  installActionTarget,
  onShowInstallModal,
  onRunAction,
  onOpenPath,
}: InstallsTabProps) {
  const text = copy[language];

  return (
    <section className={styles.detailSection}>
      {installsLoading ? (
        <div className={styles.emptyPanel}>{text.loadingInstalls}</div>
      ) : (
        <>
          {installsError ? (
            <div className={styles.inlineMessage}>{installsError}</div>
          ) : null}

          <div className={styles.variantFamilyPanel} style={{ marginBottom: 20 }}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onShowInstallModal}
            >
              {text.installToCustomLocation}
            </button>
          </div>

          {installStatuses && installStatuses.length > 0 ? (
            <div className={styles.installGrid}>
              {installStatuses.map((status) => (
                <InstallCard
                  key={status.target_id}
                  actionBusy={installActionTarget === status.target_id}
                  language={language}
                  onOpenPath={onOpenPath}
                  onRunAction={(action) =>
                    void onRunAction(status.target_id, status.target_root, action)
                  }
                  status={status}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyPanel}>{text.noTargetsBody}</div>
          )}
        </>
      )}
    </section>
  );
}

type InstallCardProps = {
  actionBusy: boolean;
  language: Language;
  onOpenPath: (path: string) => void;
  onRunAction: (action: "install" | "remove" | "repair") => void;
  status: SkillInstallStatus;
};

function InstallCard({
  actionBusy,
  language,
  onOpenPath,
  onRunAction,
  status,
}: InstallCardProps) {
  const text = copy[language];
  const action = primaryActionForStatus(status);

  return (
    <article className={styles.installCard}>
      <div className={styles.installCardHeader}>
        <div>
          <strong>{status.target_root}</strong>
          <p>
            {agentLabel(status.agent)} · {scopeLabel(status.scope, language)}
            {status.project_root ? ` · ${status.project_root}` : ""}
          </p>
        </div>
        <span
          className={
            status.health_state === "healthy" || status.health_state === "copied"
              ? styles.statusHealthy
              : status.health_state === "conflict" || status.health_state === "broken"
                ? styles.statusWarning
                : styles.statusMissing
          }
        >
          {installHealthLabel(status.health_state, language)}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div>
          <span>{text.installPath}</span>
          <strong>{status.install_path}</strong>
        </div>
        <div>
          <span>{text.installMethodLabel}</span>
          <strong>
            {status.install_method
              ? installMethodLabel(status.install_method, language)
              : "—"}
          </strong>
        </div>
        <div>
          <span>{text.recordedInstallLabel}</span>
          <strong>{status.recorded ? text.yesLabel : text.noLabel}</strong>
        </div>
        <div>
          <span>{text.pinnedInstallLabel}</span>
          <strong>{status.pinned ? text.yesLabel : text.noLabel}</strong>
        </div>
        <div>
          <span>{text.variantLabelLabel}</span>
          <strong>{status.variant_label ?? text.variantLabelFallback}</strong>
        </div>
        <div>
          <span>{text.revisionHashLabel}</span>
          <strong>{status.content_hash}</strong>
        </div>
        <div>
          <span>{text.promotedVariantLabel}</span>
          <strong>{status.is_family_default ? text.yesLabel : text.noLabel}</strong>
        </div>
        <div>
          <span>{text.lastActionLabel}</span>
          <strong>
            {status.last_action_unix_ms
              ? formatTimestamp(status.last_action_unix_ms, language)
              : "—"}
          </strong>
        </div>
      </div>

      {status.health_state === "conflict" ? (
        <p className={styles.helperText}>{text.conflictInstallBody}</p>
      ) : null}

      <div className={styles.installCardActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            onOpenPath(
              status.health_state === "not_installed" ||
                status.health_state === "missing_target"
                ? status.target_root
                : status.install_path,
            )
          }
        >
          {text.openDirectory}
        </button>

        {action ? (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={actionBusy}
            onClick={() => void onRunAction(action)}
          >
            {actionBusy
              ? action === "install"
                ? text.installingLabel
                : action === "remove"
                  ? text.removingLabel
                  : status.health_state === "copied"
                    ? text.relinkingLabel
                    : text.repairingLabel
              : action === "install"
                ? text.installNow
                : action === "remove"
                  ? text.removeInstall
                  : status.health_state === "copied"
                    ? text.relinkInstall
                    : text.repairInstall}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function primaryActionForStatus(
  status: SkillInstallStatus,
): "install" | "remove" | "repair" | null {
  if (status.health_state === "not_installed" || status.health_state === "missing_target") {
    return "install";
  }
  if (status.health_state === "broken" || status.health_state === "copied") {
    return "repair";
  }
  if (status.health_state === "healthy") {
    return "remove";
  }
  return null;
}
