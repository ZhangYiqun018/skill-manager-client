import { useEffect, useRef, useState } from "react";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import panels from "../../styles/_panels.module.css";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { copy, friendlyErrorMessage, type Language } from "../../i18n";
import type {
  AgentKind,
  RegistrySearchResponse,
  RegistrySkillResult,
  SkillScope,
} from "../../types";
import {
  fetchPopularSkills,
  fetchRegistryStats,
  searchSkillsRegistry,
  adoptRegistrySkill,
} from "../../api/discover";
import { RegistrySkillCard } from "./RegistrySkillCard";
import { RegistrySkillDetail } from "./RegistrySkillDetail";
import { AdoptConfirmDialog } from "./AdoptConfirmDialog";

type RegistryBrowserProps = {
  language: Language;
  onAdoptedAndInstall: (skillName: string) => void;
  onAdoptedLater: () => void;
  onSnapshotUpdate: (result: import("../../types").IndexedScanSummary) => void | Promise<void>;
};

export function RegistryBrowser({
  language,
  onAdoptedAndInstall,
  onAdoptedLater,
  onSnapshotUpdate,
}: RegistryBrowserProps) {
  const text = copy[language];

  const [searchQuery, setSearchQuery] = useState("");
  const [popularSkills, setPopularSkills] = useState<RegistrySkillResult[]>([]);
  const [searchResults, setSearchResults] = useState<RegistrySkillResult[] | null>(null);
  const [popularLoading, setPopularLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<RegistrySkillResult | null>(null);
  const [adoptingSkill, setAdoptingSkill] = useState<RegistrySkillResult | null>(null);
  const [adoptBusy, setAdoptBusy] = useState(false);
  const [totalSkills, setTotalSkills] = useState(0);

  // Load popular skills and registry stats on mount
  useEffect(() => {
    let cancelled = false;
    setPopularLoading(true);
    setError(null);
    fetchPopularSkills()
      .then((response) => {
        if (!cancelled) setPopularSkills(response.skills);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setPopularLoading(false);
      });
    fetchRegistryStats()
      .then((stats) => {
        if (!cancelled) setTotalSkills(stats.totalSkills);
      })
      .catch(() => {
        // Stats are non-critical, silently ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displaySkills = searchResults ?? popularSkills;
  const isSearchMode = searchResults !== null;

  const searchRequestId = useRef(0);

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      setError(null);
      return;
    }

    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setSearchLoading(true);
    setError(null);
    try {
      const result: RegistrySearchResponse = await searchSkillsRegistry(query);
      if (searchRequestId.current === requestId) {
        setSearchResults(result.skills);
      }
    } catch (err) {
      if (searchRequestId.current === requestId) {
        setError(err);
      }
    } finally {
      if (searchRequestId.current === requestId) {
        setSearchLoading(false);
      }
    }
  }

  function handleClearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setError(null);
  }

  async function handleAdoptConfirm(agent: AgentKind, scope: SkillScope) {
    if (!adoptingSkill) return;
    setAdoptBusy(true);
    try {
      const result = await adoptRegistrySkill(
        adoptingSkill.source,
        adoptingSkill.skillId,
        adoptingSkill.id,
        agent,
        scope
      );
      await onSnapshotUpdate(result);
    } catch (err) {
      setError(err);
    } finally {
      setAdoptBusy(false);
    }
  }

  function handleInstallNow() {
    const skillName = adoptingSkill?.name ?? "";
    setAdoptingSkill(null);
    onAdoptedAndInstall(skillName);
  }

  function handleAdoptLater() {
    setAdoptingSkill(null);
    onAdoptedLater();
  }

  const loading = popularLoading || searchLoading;

  const totalInstalls = popularSkills.reduce((sum, sk) => sum + sk.installs, 0);

  return (
    <section className={forms.intakeBar}>
      <div className={forms.intakeHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.registryBrowserTitle}</p>
          <p className={layout.helperText}>{text.registryBrowserBody}</p>
        </div>
      </div>

      <div className={layout.attributionRow}>
        <span>{text.registryAttribution}</span>
        <a href="https://skills.sh" target="_blank" rel="noopener noreferrer">
          {text.registryVisitSite}
        </a>
        {totalSkills > 0 ? (
          <span className={layout.attributionStat}>
            {totalSkills.toLocaleString()} {text.registryTotalSkills}
          </span>
        ) : null}
        {totalInstalls > 0 ? (
          <span className={layout.attributionStat}>
            {totalInstalls.toLocaleString()} {text.remoteInstallsLabel}
          </span>
        ) : null}
      </div>

      <div className={forms.remoteSearchRow}>
        <input
          className={forms.searchField}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSearch();
          }}
          placeholder={text.remoteSearchPlaceholder}
          value={searchQuery}
        />
        <div className={buttons.actionRow}>
          <button
            type="button"
            className={buttons.secondaryButton}
            onClick={() => void handleSearch()}
          >
            {loading ? text.remoteSearchLoading : text.remoteSearchAction}
          </button>
          {isSearchMode ? (
            <button type="button" className={buttons.secondaryButton} onClick={handleClearSearch}>
              {text.clearSearch}
            </button>
          ) : null}
        </div>
      </div>

      {!isSearchMode && !error ? (
        <p className={`${layout.sectionLabel} ${layout.mt14} ${layout.mb0}`}>
          {text.registryPopularTitle}
        </p>
      ) : null}

      {error ? (
        <EmptyState icon="wifi" title={text.offlineModeTitle} body={text.offlineModeBody}>
          <p className={layout.errorDetail}>{friendlyErrorMessage(error, language)}</p>
        </EmptyState>
      ) : loading && displaySkills.length === 0 ? (
        <div className={cards.registryGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={cards.skeletonCard}>
              <Skeleton width="36px" height="36px" radius="10px" />
              <Skeleton width="70%" height="1em" />
              <Skeleton width="100%" height="0.8em" />
              <Skeleton width="40%" height="0.8em" />
            </div>
          ))}
        </div>
      ) : displaySkills.length > 0 ? (
        <>
          <div className={cards.registryGrid}>
            {displaySkills.map((skill) => (
              <RegistrySkillCard
                key={skill.id}
                language={language}
                skill={skill}
                selected={selectedSkill?.id === skill.id}
                onClick={() => setSelectedSkill((prev) => (prev?.id === skill.id ? null : skill))}
              />
            ))}
          </div>

          {!isSearchMode && displaySkills.length > 0 ? (
            <p className={`${layout.helperText} ${layout.mt8}`}>
              {text.registrySearchHint.replace("{count}", String(displaySkills.length))}
            </p>
          ) : null}

          {selectedSkill ? (
            <RegistrySkillDetail
              skill={selectedSkill}
              language={language}
              onAdopt={() => setAdoptingSkill(selectedSkill)}
              adopting={adoptBusy && adoptingSkill?.id === selectedSkill.id}
            />
          ) : null}
        </>
      ) : isSearchMode ? (
        <div className={`${panels.emptyPanel} ${layout.mt14}`}>{text.remoteNoResults}</div>
      ) : null}

      {adoptingSkill ? (
        <AdoptConfirmDialog
          skill={adoptingSkill}
          language={language}
          onConfirm={handleAdoptConfirm}
          onInstallNow={handleInstallNow}
          onClose={handleAdoptLater}
        />
      ) : null}
    </section>
  );
}
