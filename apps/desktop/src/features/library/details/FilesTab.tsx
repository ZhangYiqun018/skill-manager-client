import styles from "../../../App.module.css";
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
    <section className={styles.detailSection}>
      {fileTreeLoading ? (
        <div className={styles.emptyPanel}>{text.loadingFiles}</div>
      ) : fileTreeError ? (
        <div className={styles.emptyPanel}>{fileTreeError}</div>
      ) : fileTree ? (
        <div className={styles.fileBrowser}>
          <div className={styles.fileTreePane}>
            <p className={styles.sectionLabel}>{text.fileTreeTitle}</p>
            <FileTreeView
              language={language}
              onSelectFile={onSelectFile}
              selectedFilePath={selectedFilePath}
              tree={fileTree}
            />
          </div>

          <div className={styles.fileViewerPane}>
            <div className={styles.previewHeader}>
              <p className={styles.sectionLabel}>{text.fileViewerTitle}</p>
              {selectedFilePath ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenPath(selectedFilePath)}
                >
                  {text.openSkillFile}
                </button>
              ) : null}
            </div>
            <div className={styles.previewFrame}>
              {selectedFileLoading ? (
                <p className={styles.previewState}>{text.loadingFile}</p>
              ) : selectedFileError ? (
                <p className={styles.previewState}>{selectedFileError}</p>
              ) : selectedFileContent ? (
                <pre className={styles.previewContent}>{selectedFileContent}</pre>
              ) : (
                <p className={styles.previewState}>{text.filePreviewUnavailable}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyPanel}>{text.noFilesBody}</div>
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

function FileTreeView({
  language,
  onSelectFile,
  selectedFilePath,
  tree,
}: FileTreeViewProps) {
  return (
    <div className={styles.fileTreeList}>
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
    <div className={styles.fileTreeNode}>
      {isDirectory ? (
        <div className={styles.fileTreeDirectory}>
          <strong>{node.name}</strong>
          <span>{node.children.length}</span>
        </div>
      ) : (
        <button
          type="button"
          className={isActive ? styles.fileTreeButtonActive : styles.fileTreeButton}
          onClick={() => onSelectFile(node.path)}
        >
          <span>{node.name}</span>
          <span>{node.kind === "symlink" ? "↗" : agentLabelLabel(language)}</span>
        </button>
      )}

      {node.children.length > 0 ? (
        <div className={styles.fileTreeChildren}>
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
