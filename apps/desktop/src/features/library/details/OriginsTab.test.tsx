import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OriginsTab } from "./OriginsTab";
import type { ManagedGitSource, ManagedSkillOrigin } from "../../../types";

describe("OriginsTab", () => {
  const gitSource: ManagedGitSource = {
    git_url: "https://github.com/example/skill.git",
    git_commit: "a1b2c3d",
    git_branch: "main",
    repo_subpath: "",
  };

  const origin: ManagedSkillOrigin = {
    origin: "https://github.com/example/skill.git",
    source_type: "git",
    recorded_unix_ms: 1710000000000,
  };

  it("renders git source and origins list", () => {
    render(
      <OriginsTab
        language="en"
        gitSourceLoading={false}
        gitSource={gitSource}
        originsLoading={false}
        originsError={null}
        origins={[origin]}
      />
    );

    expect(screen.getAllByText("Git source").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(gitSource.git_url).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Recorded origin").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(origin.origin).length).toBeGreaterThanOrEqual(1);
  });

  it("renders loading state for origins", () => {
    render(
      <OriginsTab
        language="en"
        gitSourceLoading={false}
        gitSource={null}
        originsLoading={true}
        originsError={null}
        origins={null}
      />
    );
    expect(screen.getByText("Loading origins...")).toBeInTheDocument();
  });

  it("renders empty state when no origins", () => {
    render(
      <OriginsTab
        language="en"
        gitSourceLoading={false}
        gitSource={null}
        originsLoading={false}
        originsError={null}
        origins={[]}
      />
    );
    expect(
      screen.getByText(
        "No origin records have been captured for this managed skill yet. Future adoptions will preserve them."
      )
    ).toBeInTheDocument();
  });
});
