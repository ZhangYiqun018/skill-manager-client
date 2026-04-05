import layout from "../styles/_layout.module.css";

type EmptyStateIcon = "search" | "celebration" | "target" | "wifi" | "folder";

type EmptyStateProps = {
  icon: EmptyStateIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon, title, body, children }: EmptyStateProps) {
  return (
    <div className={layout.emptyState}>
      <span className={layout.emptyStateIcon}>
        <EmptyStateSvg icon={icon} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  );
}

function EmptyStateSvg({ icon }: { icon: EmptyStateIcon }) {
  switch (icon) {
    case "search":
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "celebration":
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 16v6" />
          <path d="M10 14v8" />
          <path d="M15 10v12" />
          <path d="M20 8v14" />
          <path d="M22 6 2 18" />
        </svg>
      );
    case "target":
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "wifi":
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h.01" />
          <path d="M2 8.82a15 15 0 0 1 20 0" />
          <path d="M5 12.859a10 10 0 0 1 14 0" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
        </svg>
      );
    case "folder":
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      );
    default:
      return null;
  }
}
