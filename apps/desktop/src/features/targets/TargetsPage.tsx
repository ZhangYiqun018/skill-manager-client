import { useEffect, useState } from "react";
import badges from "../../styles/_badges.module.css";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import layout from "../../styles/_layout.module.css";
import { EmptyState } from "../../components/EmptyState";
import lists from "../../styles/_lists.module.css";
import panels from "../../styles/_panels.module.css";
import { loadInstallTargetInventory, repairInstallTarget, syncInstallTarget } from "../../api";
import {
  agentLabel,
  copy,
  friendlyErrorMessage,
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

export function TargetsPage({ language, onOpenDirectory }: TargetsPageProps) {
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
          setInventoryError(friendlyErrorMessage(error, language));
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
  }, [language]);

  const globalTargets = inventories.filter((target) => target.scope === "global");
  const projectTargets = inventories.filter((target) => target.scope === "project");

  async function runTargetAction(targetPath: string, action: "sync" | "repair") {
    setTargetActionPath(targetPath);
    setInventoryError(null);

    try {
      const nextInventories =
        action === "sync"
          ? await syncInstallTarget(targetPath)
          : await repairInstallTarget(targetPath);
      setInventories(nextInventories);
    } catch (error: unknown) {
      setInventoryError(friendlyErrorMessage(error, language));
    } finally {
      setTargetActionPath(null);
    }
  }

  return (
    <section className={layout.pageSection}>
      <header className={layout.pageHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.targetsTitle}</p>
          <h1 className={layout.pageTitle}>{text.targetsBody}</h1>
        </div>
      </header>

      {loadingInventory ? (
        <div className={panels.emptyPanel}>{text.loadingTargets}</div>
      ) : inventoryError ? (
        <div className={panels.emptyPanel}>{inventoryError}</div>
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
    <section className={layout.targetGroup}>
      <div className={panels.panelHeader}>
        <div>
          <p className={layout.sectionLabel}>{title}</p>
        </div>
      </div>

      {targets.length === 0 ? (
        <EmptyState icon="target" title={text.emptyTargetsTitle} body={text.emptyTargetsBody} />
      ) : (
        <div className={lists.targetGrid}>
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
  const attentionItems = target.items.filter(
    (item) =>
      item.health_state === "broken" ||
      item.health_state === "copied" ||
      item.health_state === "not_installed"
  );
  const canRepair = attentionItems.length > 0;
  const canSync = target.items.some((item) => item.health_state !== "healthy");

  return (
    <article className={cards.targetCard}>
      <div className={cards.targetCardHeader}>
        <div className={badges.badgeRow}>
          <span className={badges.scopeBadge} data-scope={target.scope}>
            {scopeLabel(target.scope, language)}
          </span>
          <span className={badges.agentBadge} data-agent={target.agent}>
            {agentLabel(target.agent)}
          </span>
        </div>
        <span
          className={
            target.health_state === "healthy"
              ? badges.statusHealthy
              : target.health_state === "warning"
                ? badges.statusWarning
                : badges.statusMissing
          }
        >
          {healthLabel(target.health_state, language)}
        </span>
      </div>

      <p className={layout.directoryPath}>{target.path}</p>

      <div className={cards.targetInventoryMeta}>
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

      <div className={cards.targetCardActions}>
        <button
          type="button"
          className={buttons.secondaryButton}
          onClick={() => onOpenDirectory(target.path)}
          disabled={!target.exists}
        >
          {text.openDirectory}
        </button>
        <button
          type="button"
          className={buttons.secondaryButton}
          disabled={!canSync || actionBusy}
          onClick={() => void onRunAction(target.path, "sync")}
        >
          {actionBusy ? text.syncingTarget : text.syncTarget}
        </button>
        <button
          type="button"
          className={buttons.primaryButton}
          disabled={!canRepair || actionBusy}
          onClick={() => void onRunAction(target.path, "repair")}
        >
          {actionBusy ? text.repairingTarget : text.repairTarget}
        </button>
      </div>

      <div className={lists.targetRecordedList}>
        <div className={lists.targetListHeader}>
          <p className={layout.sectionLabel}>{text.brokenTargetsLabel}</p>
          {target.items.length > 0 && (
            <button
              type="button"
              className={buttons.ghostButton}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? text.collapse : `${text.expand} (${attentionItems.length})`}
            </button>
          )}
        </div>
        {!expanded ? null : attentionItems.length === 0 ? (
          <div className={panels.emptyPanel}>{text.healthOkay}</div>
        ) : (
          attentionItems.map((item) => (
            <article
              key={`${target.id}-${item.managed_skill_path}`}
              className={lists.targetItemCard}
            >
              <div className={layout.discoveryGroupHeader}>
                <div>
                  <strong>{item.display_name}</strong>
                  <p className={layout.helperText}>{item.family_key}</p>
                </div>
                <span
                  className={
                    item.health_state === "healthy"
                      ? badges.statusHealthy
                      : item.health_state === "missing_target"
                        ? badges.statusMissing
                        : badges.statusWarning
                  }
                >
                  {installHealthLabel(item.health_state, language)}
                </span>
              </div>
              <div className={layout.groupMetaRow}>
                {item.variant_label ? (
                  <span className={badges.inlineTag}>
                    {text.variantLabelLabel}: {item.variant_label}
                  </span>
                ) : null}
                {item.pinned ? (
                  <span className={badges.inlineTag}>{text.pinnedInstallLabel}</span>
                ) : null}
                {item.is_family_default ? (
                  <span className={badges.inlineTag}>{text.promotedVariantLabel}</span>
                ) : null}
                <span className={badges.inlineTag}>
                  {installMethodLabel(item.install_method ?? "symlink", language)}
                </span>
              </div>
              <p className={layout.directoryPath}>{item.install_path}</p>
            </article>
          ))
        )}
      </div>
    </article>
  );
}
