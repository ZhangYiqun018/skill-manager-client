import { describe, it, expect } from "vitest";
import { friendlyErrorMessage, agentLabel, scopeLabel, sourceLabel } from "../i18n";
import type { AppError } from "../types";

describe("friendlyErrorMessage", () => {
  it("returns message for plain Error", () => {
    const error = new Error("Something went wrong");
    expect(friendlyErrorMessage(error, "en")).toBe("Something went wrong");
  });

  it("returns unknown text for null", () => {
    expect(friendlyErrorMessage(null, "en")).toContain("unexpected");
  });

  it("maps io error", () => {
    const error: AppError = { kind: "io", code: "E_IO", message: "io failed" };
    expect(friendlyErrorMessage(error, "en")).toContain("file system");
  });

  it("maps network error", () => {
    const error: AppError = { kind: "network", code: "E_NET", message: "net failed" };
    expect(friendlyErrorMessage(error, "en")).toContain("connection");
  });
});

describe("agentLabel", () => {
  it("returns labels for known agents", () => {
    expect(agentLabel("codex")).toBe("Codex");
    expect(agentLabel("claude_code")).toBe("Claude Code");
    expect(agentLabel("agent")).toBe("Agent");
  });
});

describe("scopeLabel", () => {
  it("returns labels for known scopes", () => {
    expect(scopeLabel("global", "en")).toBe("Global");
    expect(scopeLabel("project", "en")).toBe("Project");
  });
});

describe("sourceLabel", () => {
  it("returns labels for known sources", () => {
    expect(sourceLabel("disk", "en")).toBe("Disk");
    expect(sourceLabel("import", "en")).toBe("Import");
    expect(sourceLabel("remote", "en")).toBe("Remote");
  });
});
