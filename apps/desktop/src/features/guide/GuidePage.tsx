import { useState } from "react";
import styles from "../../App.module.css";
import { copy, type Language } from "../../i18n";

type GuidePageProps = {
  language: Language;
};

export function GuidePage({ language }: GuidePageProps) {
  const text = copy[language];
  const [openSection, setOpenSection] = useState<string | null>("quickstart");

  const toggle = (id: string) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.guideTitle}</p>
          <h1 className={styles.pageTitle}>{text.guideBody}</h1>
        </div>
      </header>

      <div className={styles.settingsGrid} style={{ gridTemplateColumns: "1fr" }}>
        <GuideCard
          id="quickstart"
          isOpen={openSection === "quickstart"}
          onToggle={() => toggle("quickstart")}
          title={text.guideQuickStartTitle}
        >
          <p>{text.guideQuickStartBody}</p>
        </GuideCard>

        <GuideCard
          id="library"
          isOpen={openSection === "library"}
          onToggle={() => toggle("library")}
          title={text.guideLibraryTitle}
        >
          <p>{text.guideLibraryBody}</p>
        </GuideCard>

        <GuideCard
          id="discover"
          isOpen={openSection === "discover"}
          onToggle={() => toggle("discover")}
          title={text.guideDiscoverTitle}
        >
          <p>{text.guideDiscoverBody}</p>
        </GuideCard>

        <GuideCard
          id="targets"
          isOpen={openSection === "targets"}
          onToggle={() => toggle("targets")}
          title={text.guideTargetsTitle}
        >
          <p>{text.guideTargetsBody}</p>
        </GuideCard>

        <GuideCard
          id="settings"
          isOpen={openSection === "settings"}
          onToggle={() => toggle("settings")}
          title={text.guideSettingsTitle}
        >
          <p>{text.guideSettingsBody}</p>
        </GuideCard>
      </div>
    </section>
  );
}

type GuideCardProps = {
  children: React.ReactNode;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
};

function GuideCard({ children, isOpen, onToggle, title }: GuideCardProps) {
  return (
    <article className={styles.settingsCard}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "transparent",
          border: "none",
          padding: 0,
          font: "inherit",
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--sm-text)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {title}
        <span
          style={{
            display: "inline-flex",
            width: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            background: "var(--sm-surface-hover)",
            color: "var(--sm-text-secondary)",
            fontSize: "0.8rem",
          }}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div
          style={{
            marginTop: 12,
            lineHeight: 1.7,
            color: "var(--sm-text-secondary)",
          }}
        >
          {children}
        </div>
      ) : null}
    </article>
  );
}
