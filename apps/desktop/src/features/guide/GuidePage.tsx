import { useRef, useState } from "react";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import layout from "../../styles/_layout.module.css";
import { copy, type Language } from "../../i18n";

type GuidePageProps = {
  language: Language;
};

const SECTION_ICONS: Record<string, string> = {
  quickstart: "▶",
  library: "◫",
  discover: "◎",
  targets: "⊞",
  settings: "⚙",
  shortcuts: "⌨",
  faq: "?",
};

export function GuidePage({ language }: GuidePageProps) {
  const text = copy[language];
  const [openSection, setOpenSection] = useState<string | null>("quickstart");

  const toggle = (id: string) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  return (
    <section className={layout.pageSection}>
      <header className={layout.pageHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.guideTitle}</p>
          <h1 className={layout.pageTitle}>{text.guideBody}</h1>
        </div>
      </header>

      <div className={layout.guideGrid}>
        <GuideCard
          id="quickstart"
          icon={SECTION_ICONS.quickstart}
          isOpen={openSection === "quickstart"}
          onToggle={() => toggle("quickstart")}
          title={text.guideQuickStartTitle}
        >
          <GuideContent text={text.guideQuickStartBody} />
        </GuideCard>

        <GuideCard
          id="library"
          icon={SECTION_ICONS.library}
          isOpen={openSection === "library"}
          onToggle={() => toggle("library")}
          title={text.guideLibraryTitle}
        >
          <GuideContent text={text.guideLibraryBody} />
        </GuideCard>

        <GuideCard
          id="discover"
          icon={SECTION_ICONS.discover}
          isOpen={openSection === "discover"}
          onToggle={() => toggle("discover")}
          title={text.guideDiscoverTitle}
        >
          <GuideContent text={text.guideDiscoverBody} />
        </GuideCard>

        <GuideCard
          id="targets"
          icon={SECTION_ICONS.targets}
          isOpen={openSection === "targets"}
          onToggle={() => toggle("targets")}
          title={text.guideTargetsTitle}
        >
          <GuideContent text={text.guideTargetsBody} />
        </GuideCard>

        <GuideCard
          id="settings"
          icon={SECTION_ICONS.settings}
          isOpen={openSection === "settings"}
          onToggle={() => toggle("settings")}
          title={text.guideSettingsTitle}
        >
          <GuideContent text={text.guideSettingsBody} />
        </GuideCard>

        <GuideCard
          id="shortcuts"
          icon={SECTION_ICONS.shortcuts}
          isOpen={openSection === "shortcuts"}
          onToggle={() => toggle("shortcuts")}
          title={text.guideShortcutsTitle}
        >
          <GuideContent text={text.guideShortcutsBody} />
        </GuideCard>

        <GuideCard
          id="faq"
          icon={SECTION_ICONS.faq}
          isOpen={openSection === "faq"}
          onToggle={() => toggle("faq")}
          title={text.guideFaqTitle}
        >
          <GuideContent text={text.guideFaqBody} />
        </GuideCard>
      </div>
    </section>
  );
}

type GuideCardProps = {
  children: React.ReactNode;
  icon: string;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
};

function GuideCard({ children, icon, id, isOpen, onToggle, title }: GuideCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <article className={cards.settingsCard}>
      <button
        type="button"
        className={buttons.guideCardButton}
        aria-expanded={isOpen}
        aria-controls={`guide-section-${id}`}
        onClick={onToggle}
      >
        <span className={layout.guideIconRow}>
          <span className={layout.guideIconBadge}>{icon}</span>
          {title}
        </span>
        <span className={layout.guideChevron}>{isOpen ? "−" : "+"}</span>
      </button>
      <div
        ref={contentRef}
        id={`guide-section-${id}`}
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? 1200 : 0,
          opacity: isOpen ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.25s ease",
        }}
      >
        <div className={layout.guideCardContent}>{children}</div>
      </div>
    </article>
  );
}

function GuideContent({ text }: { text: string }) {
  // Simple markdown-like rendering: **bold** and line breaks
  const parts = text.split("\n\n");

  return (
    <div className={layout.guideContentGrid}>
      {parts.map((block, blockIndex) => {
        const lines = block.split("\n");
        return (
          <div key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInlineBold(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className={layout.guideTextBold}>
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
