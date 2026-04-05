import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstallsTab } from "./InstallsTab";
import type { SkillInstallStatus } from "../../../types";

describe("InstallsTab", () => {
  const baseStatus: SkillInstallStatus = {
    target_id: "t1",
    target_root: "/target",
    install_path: "/target/skill",
    agent: "codex",
    scope: "global",
    health_state: "not_installed",
    install_method: null,
    recorded: false,
    pinned: false,
    variant_label: null,
    content_hash: "abc123",
    is_family_default: false,
    last_action_unix_ms: null,
    project_root: null,
  };

  it("renders loading state", () => {
    render(
      <InstallsTab
        language="zh"
        installsLoading={true}
        installsError={null}
        installStatuses={null}
        installActionTarget={null}
        onShowInstallModal={vi.fn()}
        onRunAction={vi.fn()}
        onOpenPath={vi.fn()}
      />
    );
    expect(screen.getByText("正在加载安装状态...")).toBeInTheDocument();
  });

  it("renders install cards and triggers actions", () => {
    const onRunAction = vi.fn();
    const onOpenPath = vi.fn();
    render(
      <InstallsTab
        language="zh"
        installsLoading={false}
        installsError={null}
        installStatuses={[baseStatus]}
        installActionTarget={null}
        onShowInstallModal={vi.fn()}
        onRunAction={onRunAction}
        onOpenPath={onOpenPath}
      />
    );

    expect(screen.getByText("/target")).toBeInTheDocument();
    expect(screen.getByText("安装")).toBeInTheDocument();

    fireEvent.click(screen.getByText("打开目录"));
    expect(onOpenPath).toHaveBeenCalledWith("/target");

    fireEvent.click(screen.getByText("安装"));
    expect(onRunAction).toHaveBeenCalledWith("t1", "/target", "install");
  });

  it("disables action button when busy", () => {
    render(
      <InstallsTab
        language="zh"
        installsLoading={false}
        installsError={null}
        installStatuses={[baseStatus]}
        installActionTarget="t1"
        onShowInstallModal={vi.fn()}
        onRunAction={vi.fn()}
        onOpenPath={vi.fn()}
      />
    );

    const busyButton = screen.getByText("正在安装...");
    expect(busyButton).toBeDisabled();
  });

  it("opens install path for installed target", () => {
    const onOpenPath = vi.fn();
    const installed = { ...baseStatus, health_state: "healthy" as const };
    render(
      <InstallsTab
        language="zh"
        installsLoading={false}
        installsError={null}
        installStatuses={[installed]}
        installActionTarget={null}
        onShowInstallModal={vi.fn()}
        onRunAction={vi.fn()}
        onOpenPath={onOpenPath}
      />
    );

    fireEvent.click(screen.getByText("打开目录"));
    expect(onOpenPath).toHaveBeenCalledWith("/target/skill");
  });
});
