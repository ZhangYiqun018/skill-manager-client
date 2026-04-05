import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilesTab } from "./FilesTab";

describe("FilesTab", () => {
  const baseTree = {
    path: "/skill",
    name: "skill",
    kind: "directory",
    children: [
      { path: "/skill/SKILL.md", name: "SKILL.md", kind: "file", children: [] },
      {
        path: "/skill/src",
        name: "src",
        kind: "directory",
        children: [{ path: "/skill/src/index.ts", name: "index.ts", kind: "file", children: [] }],
      },
    ],
  } as unknown as Parameters<typeof FilesTab>[0]["fileTree"];

  it("renders loading state", () => {
    render(
      <FilesTab
        language="zh"
        fileTreeLoading={true}
        fileTreeError={null}
        fileTree={null}
        selectedFilePath={null}
        selectedFileLoading={false}
        selectedFileError={null}
        selectedFileContent={null}
        onSelectFile={vi.fn()}
        onOpenPath={vi.fn()}
      />
    );
    expect(screen.getByText("正在加载文件树...")).toBeInTheDocument();
  });

  it("renders file tree and allows selecting a file", () => {
    const onSelectFile = vi.fn();
    render(
      <FilesTab
        language="zh"
        fileTreeLoading={false}
        fileTreeError={null}
        fileTree={baseTree}
        selectedFilePath={null}
        selectedFileLoading={false}
        selectedFileError={null}
        selectedFileContent={null}
        onSelectFile={onSelectFile}
        onOpenPath={vi.fn()}
      />
    );

    expect(screen.getByText("SKILL.md")).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();

    fireEvent.click(screen.getByText("SKILL.md"));
    expect(onSelectFile).toHaveBeenCalledWith("/skill/SKILL.md");
  });

  it("renders selected file content and opens path", () => {
    const onOpenPath = vi.fn();
    render(
      <FilesTab
        language="zh"
        fileTreeLoading={false}
        fileTreeError={null}
        fileTree={baseTree}
        selectedFilePath="/skill/SKILL.md"
        selectedFileLoading={false}
        selectedFileError={null}
        selectedFileContent="# Hello"
        onSelectFile={vi.fn()}
        onOpenPath={onOpenPath}
      />
    );

    expect(screen.getByText("# Hello")).toBeInTheDocument();
    fireEvent.click(screen.getByText("定位 SKILL.md"));
    expect(onOpenPath).toHaveBeenCalledWith("/skill/SKILL.md");
  });

  it("renders empty state when no files", () => {
    render(
      <FilesTab
        language="zh"
        fileTreeLoading={false}
        fileTreeError={null}
        fileTree={null}
        selectedFilePath={null}
        selectedFileLoading={false}
        selectedFileError={null}
        selectedFileContent={null}
        onSelectFile={vi.fn()}
        onOpenPath={vi.fn()}
      />
    );
    expect(screen.getByText("这个 skill 目录里没有可显示的文件。")).toBeInTheDocument();
  });
});
