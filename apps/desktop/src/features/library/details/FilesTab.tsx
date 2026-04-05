import buttons from "../../../styles/_buttons.module.css";
import layout from "../../../styles/_layout.module.css";
import lists from "../../../styles/_lists.module.css";
import panels from "../../../styles/_panels.module.css";
import { copy, type Language } from "../../../i18n";
import type { SkillFileNode } from "../../../types";
import { agentLabelLabel } from "./utils";

type FilesTabProps = {
  language: Language;
  fileTreeLoading: boolean;
  fileTreeError: string | null;
  fileTree: SkillFileNode | null;
  selectedFilePath: string | null;
  selectedFileLoading: boolean;
  selectedFileError: string | null;
  selectedFileContent: string | null;
  onSelectFile: (path: string) => void;
  onOpenPath: (path: string) => void;
};

export function FilesTab({
  language,
  fileTreeLoading,
  fileTreeError,
  fileTree,
  selectedFilePath,
  selectedFileLoading,
  selectedFileError,
  selectedFileContent,
  onSelectFile,
  onOpenPath,
}: FilesTabProps) {
  const text = copy[language];

  return (
    <section className={panels.detailSection}>
      {fileTreeLoading ? (
        <div className={panels.emptyPanel}>{text.loadingFiles}</div>
      ) : fileTreeError ? (
        <div className={panels.emptyPanel}>{fileTreeError}</div>
      ) : fileTree ? (
        <div className={panels.fileBrowser}>
          <div className={lists.fileTreePane}>
            <p className={layout.sectionLabel}>{text.fileTreeTitle}</p>
            <FileTreeView
              language={language}
              onSelectFile={onSelectFile}
              selectedFilePath={selectedFilePath}
              tree={fileTree}
            />
          </div>

          <div className={lists.fileViewerPane}>
            <div className={panels.previewHeader}>
              <p className={layout.sectionLabel}>{text.fileViewerTitle}</p>
              {selectedFilePath ? (
                <button
                  type="button"
                  className={buttons.secondaryButton}
                  onClick={() => onOpenPath(selectedFilePath)}
                >
                  {text.openSkillFile}
                </button>
              ) : null}
            </div>
            <div className={panels.previewFrame}>
              {selectedFileLoading ? (
                <p className={panels.previewState}>{text.loadingFile}</p>
              ) : selectedFileError ? (
                <p className={panels.previewState}>{selectedFileError}</p>
              ) : selectedFileContent ? (
                <pre className={panels.previewContent}>{selectedFileContent}</pre>
              ) : (
                <p className={panels.previewState}>{text.filePreviewUnavailable}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={panels.emptyPanel}>{text.noFilesBody}</div>
      )}
    </section>
  );
}

type FileTreeViewProps = {
  language: Language;
  onSelectFile: (path: string) => void;
  selectedFilePath: string | null;
  tree: SkillFileNode;
};

function FileTreeView({ language, onSelectFile, selectedFilePath, tree }: FileTreeViewProps) {
  return (
    <div className={lists.fileTreeList}>
      <FileTreeNodeView
        language={language}
        node={tree}
        onSelectFile={onSelectFile}
        selectedFilePath={selectedFilePath}
      />
    </div>
  );
}

type FileTreeNodeViewProps = {
  language: Language;
  node: SkillFileNode;
  onSelectFile: (path: string) => void;
  selectedFilePath: string | null;
};

function FileTreeNodeView({
  language,
  node,
  onSelectFile,
  selectedFilePath,
}: FileTreeNodeViewProps) {
  const isDirectory = node.kind === "directory";
  const isActive = selectedFilePath === node.path;

  return (
    <div className={lists.fileTreeNode}>
      {isDirectory ? (
        <div className={lists.fileTreeDirectory}>
          <strong>{node.name}</strong>
          <span>{node.children.length}</span>
        </div>
      ) : (
        <button
          type="button"
          className={isActive ? lists.fileTreeButtonActive : lists.fileTreeButton}
          onClick={() => onSelectFile(node.path)}
        >
          <span>{node.name}</span>
          <span>{node.kind === "symlink" ? "↗" : agentLabelLabel(language)}</span>
        </button>
      )}

      {node.children.length > 0 ? (
        <div className={lists.fileTreeChildren}>
          {node.children.map((child) => (
            <FileTreeNodeView
              key={child.path}
              language={language}
              node={child}
              onSelectFile={onSelectFile}
              selectedFilePath={selectedFilePath}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
