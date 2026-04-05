import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./useLibraryDetailsState";

describe("useLibraryDetailsState reducer", () => {
  it("RESET returns initial state with selected skill defaults", () => {
    const skill = {
      path: "/skill",
      skill_md: "/skill/SKILL.md",
      variant_label: "v2",
    } as unknown as Parameters<typeof reducer>[1]["payload"]["selectedSkill"];

    const next = reducer(
      { ...initialState, fileTreeLoading: true, fileTreeError: "err" },
      { type: "RESET", payload: { selectedSkill: skill } }
    );

    expect(next.fileTreeLoading).toBe(false);
    expect(next.fileTreeError).toBeNull();
    expect(next.selectedFilePath).toBe("/skill/SKILL.md");
    expect(next.variantLabelDraft).toBe("v2");
  });

  it("RESET handles null selectedSkill", () => {
    const next = reducer(
      { ...initialState, fileTreeLoading: true },
      { type: "RESET", payload: { selectedSkill: null } }
    );

    expect(next.selectedFilePath).toBeNull();
    expect(next.variantLabelDraft).toBe("");
  });

  it("SET_FILE_TREE stores tree", () => {
    const tree = { name: "root", children: [] } as unknown as Parameters<
      typeof reducer
    >[1]["payload"];
    const next = reducer(initialState, {
      type: "SET_FILE_TREE",
      payload: tree,
    });
    expect(next.fileTree).toEqual(tree);
  });

  it("SET_SELECTED_FILE_PATH updates path", () => {
    const next = reducer(initialState, {
      type: "SET_SELECTED_FILE_PATH",
      payload: "/foo.md",
    });
    expect(next.selectedFilePath).toBe("/foo.md");
  });

  it("SET_FILE_TREE_ERROR stores error message", () => {
    const next = reducer(initialState, {
      type: "SET_FILE_TREE_ERROR",
      payload: "Network error",
    });
    expect(next.fileTreeError).toBe("Network error");
  });

  it("returns same state for unknown action", () => {
    // @ts-expect-error testing unknown action
    const next = reducer(initialState, { type: "UNKNOWN" });
    expect(next).toBe(initialState);
  });
});
