import { useEffect, useState } from "react";
import styles from "../../App.module.css";
import {
  loadInstallTargetInventory,
  repairInstallTarget,
  syncInstallTarget,
} from "../../api";
import {
  agentLabel,
  copy,
  healthLabel,
  installHealthLabel,
  installMethodLabel,
  scopeLabel,
  type Language,
} from "../../i18n";
import type { InstallTargetInventory } from "../../types";

type TargetsPageProps = {
  language: Language;
  onOpenDirectory: (path: string) => void;
};

export function TargetsPage({
  language,
  onOpenDirectory,
}: TargetsPageProps) {
  const text = copy[language];
  const [inventories, setInventories] = useState<InstallTargetInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [targetActionPath, setTargetActionPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingInventory(true);
    setInventoryError(null);

    void loadInstallTargetInventory()
      .then((nextInventories) => {
        if (!cancelled) {
          setInventories(nextInventories);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInventoryError(
            error instanceof Error ? error.message : text.defaultScanError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInventory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [text.defaultScanError]);

  const globalTargets = inventories.filter((target) => target.scope === "global");
  const projectTargets = inventories.filter((target) => target.scope === "project");

  async function runTargetAction(
    targetPath: string,
    action: "sync" | "repair",
  ) {
    setTargetActionPath(targetPath);
    setInventoryError(null);

    try {
      const nextInventories =
        action === "sync"
          ? await syncInstallTarget(targetPath)
          : await repairInstallTarget(targetPath);
      setInventories(nextInventories);
    } catch (error: unknown) {
      setInventoryError(error instanceof Error ? error.message : text.defaultScanError);
    } finally {
      setTargetActionPath(null);
    }
  }

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.targetsTitle}</p>
          <h1 className={styles.pageTitle}>{text.targetsBody}</h1>
        </div>
      </header>

      {loadingInventory ? (
        <div className={styles.emptyPanel}>{text.loadingTargets}</div>
      ) : inventoryError ? (
        <div className={styles.emptyPanel}>{inventoryError}</div>
      ) : (
        <>
          <TargetGroup
            actionPath={targetActionPath}
            language={language}
            onOpenDirectory={onOpenDirectory}
            onRunAction={runTargetAction}
            targets={globalTargets}
            title={text.globalTargetsTitle}
          />
          <TargetGroup
            actionPath={targetActionPath}
            language={language}
            onOpenDirectory={onOpenDirectory}
            onRunAction={runTargetAction}
            targets={projectTargets}
            title={text.projectTargetsTitle}
          />
        </>
      )}
    </section>
  );
}

type TargetGroupProps = {
  actionPath: string | null;
  language: Language;
  onOpenDirectory: (path: string) => void;
  onRunAction: (targetPath: string, action: "sync" | "repair") => Promise<void>;
  targets: InstallTargetInventory[];
  title: string;
};

function TargetGroup({
  actionPath,
  language,
  onOpenDirectory,
  onRunAction,
  targets,
  title,
}: TargetGroupProps) {
  const text = copy[language];

  return (
    <section className={styles.targetGroup}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.sectionLabel}>{title}</p>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>🎯</span>
          <strong>{text.emptyTargetsTitle}</strong>
          <p>{text.emptyTargetsBody}</p>
        </div>
      ) : (
        <div className={styles.targetGrid}>
          {targets.map((target) => (
            <TargetCard
              actionBusy={actionPath === target.path}
              key={target.id}
              language={language}
              onOpenDirectory={onOpenDirectory}
              onRunAction={onRunAction}
              target={target}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type TargetCardProps = {
  actionBusy: boolean;
  language: Language;
  onOpenDirectory: (path: string) => void;
  onRunAction: (targetPath: string, action: "sync" | "repair") => Promise<void>;
  target: InstallTargetInventory;
};

function TargetCard({
  actionBusy,
  language,
  onOpenDirectory,
  onRunAction,
  target,
}: TargetCardProps) {
  const text = copy[language];
  const [expanded, setExpanded] = useState(false);
  const attentionItems = target.items.filter((item) =>
    item.health_state === "broken" ||
    item.health_state === "copied" ||
    item.health_state === "not_installed",
  );
  const canRepair = attentionItems.length > 0;
  const canSync = target.items.some((item) => item.health_state !== "healthy");

  return (
    <article className={styles.targetCard}>
      <div className={styles.targetCardHeader}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>{scopeLabel(target.scope, language)}</span>
          <span className={styles.agentBadge} data-agent={target.agent}>
            {agentLabel(target.agent)}
          </span>
        </div>
        <span
          className={
            target.health_state === "healthy"
              ? styles.statusHealthy
              : target.health_state === "warning"
                ? styles.statusWarning
                : styles.statusMissing
          }
        >
          {healthLabel(target.health_state, language)}
        </span>
      </div>

      <p className={styles.directoryPath}>{target.path}</p>

      <div className={styles.targetInventoryMeta}>
        <span>
          {target.managed_install_count} {text.managedInstallsLabel}
        </span>
        <span>
          {target.discovered_skill_count} {text.discoveredOnDiskLabel}
        </span>
        <span>
          {target.needs_attention_count} {text.brokenTargetsLabel}
        </span>
      </div>

      <div className={styles.targetCardActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onOpenDirectory(target.path)}
          disabled={!target.exists}
        >
          {text.openDirectory}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={!canSync || actionBusy}
          onClick={() => void onRunAction(target.path, "sync")}
        >
          {actionBusy ? text.syncingTarget : text.syncTarget}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!canRepair || actionBusy}
          onClick={() => void onRunAction(target.path, "repair")}
        >
          {actionBusy ? text.repairingTarget : text.repairTarget}
        </button>
      </div>

      <div className={styles.targetRecordedList}>
        <div className={styles.targetListHeader}>
          <p className={styles.sectionLabel}>{text.brokenTargetsLabel}</p>
          {target.items.length > 0 && (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? text.collapse
                : `${text.expand} (${attentionItems.length})`}
            </button>
          )}
        </div>
        {!expanded ? null : attentionItems.length === 0 ? (
          <div className={styles.emptyPanel}>{text.healthOkay}</div>
        ) : (
          attentionItems.map((item) => (
            <article key={`${target.id}-${item.managed_skill_path}`} className={styles.targetItemCard}>
              <div className={styles.discoveryGroupHeader}>
                <div>
                  <strong>{item.display_name}</strong>
                  <p className={styles.helperText}>{item.family_key}</p>
                </div>
                <span
                  className={
                    item.health_state === "healthy"
                      ? styles.statusHealthy
                      : item.health_state === "missing_target"
                        ? styles.statusMissing
                        : styles.statusWarning
                  }
                >
                  {installHealthLabel(item.health_state, language)}
                </span>
              </div>
              <div className={styles.groupMetaRow}>
                {item.variant_label ? (
                  <span className={styles.inlineTag}>
                    {text.variantLabelLabel}: {item.variant_label}
                  </span>
                ) : null}
                {item.pinned ? (
                  <span className={styles.inlineTag}>{text.pinnedInstallLabel}</span>
                ) : null}
                {item.is_family_default ? (
                  <span className={styles.inlineTag}>{text.promotedVariantLabel}</span>
                ) : null}
                <span className={styles.inlineTag}>
                  {installMethodLabel(item.install_method ?? "symlink", language)}
                </span>
              </div>
              <p className={styles.directoryPath}>{item.install_path}</p>
            </article>
          ))
        )}
      </div>
    </article>
  );
}
