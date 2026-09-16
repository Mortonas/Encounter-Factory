import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes script tags, inline handlers, and javascript URLs while preserving safe markup", () => {
    const dirty = `
      <h1 onclick="alert('xss')">Moon Gate</h1>
      <script>alert("owned")</script>
      <a href="javascript:alert('xss')">bad link</a>
      <p><strong>Safe tactics</strong></p>
    `;

    const clean = sanitizeHtml(dirty);

    expect(clean).toContain("<h1>Moon Gate</h1>");
    expect(clean).toContain("<strong>Safe tactics</strong>");
    expect(clean).toContain(">bad link</a>");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
  });
});
