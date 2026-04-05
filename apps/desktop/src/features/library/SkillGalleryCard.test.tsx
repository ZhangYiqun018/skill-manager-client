import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillGalleryCard } from "./SkillGalleryCard";
import type { SkillItem } from "../../types";

describe("SkillGalleryCard", () => {
  const baseGroup = {
    familyKey: "test-family",
    displayName: "Test Skill",
    skills: [
      {
        path: "/skill/test",
        skill_md: "/skill/test/SKILL.md",
        display_name: "Test Skill",
        family_key: "test-family",
        slug: "test",
        agent: "codex" as const,
        scope: "global" as const,
        source_type: "import" as const,
        content_hash: "abc123",
        source_root: "/store",
        tags: ["frontend"],
        metadata: {},
        health_state: "healthy" as const,
        warning_count: 0,
      } satisfies SkillItem,
    ],
  };

  const defaultProps = {
    group: baseGroup,
    language: "en" as const,
    delay: 0,
    tags: ["frontend"],
    onSelect: vi.fn(),
    onContextMenu: vi.fn(),
    onInstall: vi.fn(),
    onAddTag: vi.fn(),
    onTagClick: vi.fn(),
    installTitle: "Install",
    installLabel: "Install",
    variantCountLabel: "variants",
    issuesLabel: "issues",
    addTagLabel: "Add tag",
  };

  it("renders tags and calls onTagClick when a tag is clicked", () => {
    const onTagClick = vi.fn();
    render(<SkillGalleryCard {...defaultProps} onTagClick={onTagClick} />);

    fireEvent.click(screen.getByTitle("#frontend"));
    expect(onTagClick).toHaveBeenCalledWith("frontend");
  });

  it("shows hidden tag count when there are more than 3 tags", () => {
    render(<SkillGalleryCard {...defaultProps} tags={["a", "b", "c", "d", "e"]} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("opens tag input when clicking the add button", () => {
    render(<SkillGalleryCard {...defaultProps} tags={[]} />);

    fireEvent.click(screen.getByTitle("Add tag"));
    expect(screen.getByPlaceholderText("Add tag")).toBeInTheDocument();
  });

  it("calls onAddTag and does NOT trigger onSelect when pressing Enter in tag input", () => {
    const onAddTag = vi.fn();
    const onSelect = vi.fn();
    render(
      <SkillGalleryCard {...defaultProps} tags={[]} onAddTag={onAddTag} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByTitle("Add tag"));
    const input = screen.getByPlaceholderText("Add tag");
    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onAddTag).toHaveBeenCalledWith("react");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes tag input on Escape without calling onAddTag", () => {
    const onAddTag = vi.fn();
    render(<SkillGalleryCard {...defaultProps} tags={[]} onAddTag={onAddTag} />);

    fireEvent.click(screen.getByTitle("Add tag"));
    const input = screen.getByPlaceholderText("Add tag");
    fireEvent.change(input, { target: { value: "vue" } });
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    expect(onAddTag).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("Add tag")).not.toBeInTheDocument();
  });

  it("still navigates to detail when pressing Enter on the card itself", () => {
    const onSelect = vi.fn();
    const { container } = render(<SkillGalleryCard {...defaultProps} onSelect={onSelect} />);

    const card = container.querySelector('[role="button"]');
    fireEvent.keyDown(card!, { key: "Enter", code: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders installed badge when there are healthy installs", () => {
    render(
      <SkillGalleryCard
        {...defaultProps}
        installStatuses={[
          {
            target_id: "t1",
            target_root: "/target",
            install_path: "/target/skill",
            agent: "codex",
            scope: "global",
            root_exists: true,
            health_state: "healthy",
            recorded: true,
            pinned: false,
            content_hash: "abc",
            is_family_default: true,
          },
        ]}
      />
    );
    expect(screen.getByText("Installed")).toBeInTheDocument();
  });

  it("renders install issues badge when there are broken/copied/conflict installs", () => {
    render(
      <SkillGalleryCard
        {...defaultProps}
        installStatuses={[
          {
            target_id: "t1",
            target_root: "/target",
            install_path: "/target/skill",
            agent: "codex",
            scope: "global",
            root_exists: true,
            health_state: "broken",
            recorded: true,
            pinned: false,
            content_hash: "abc",
            is_family_default: true,
          },
        ]}
      />
    );
    expect(screen.getByText("Install issues")).toBeInTheDocument();
  });
});
