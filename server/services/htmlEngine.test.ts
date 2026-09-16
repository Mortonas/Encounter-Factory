import { describe, expect, it } from "vitest";
import { generateStandaloneHtml } from "./htmlEngine";

describe("generateStandaloneHtml sanitization", () => {
  it("sanitizes marked encounter content before injecting it into the export template", async () => {
    const html = await generateStandaloneHtml(`
# Moon Gate

<script>alert("owned")</script>

<img src="x" onerror="alert('xss')">

[unsafe](javascript:alert('xss'))

**Safe tactics**
`, "job-1", "# Obsidian");

    const contentHtml = html.match(/<article id="content">([\s\S]*?)<\/article>/)?.[1] || "";

    expect(contentHtml).toContain("Moon Gate");
    expect(contentHtml).toContain("<strong>Safe tactics</strong>");
    expect(contentHtml).not.toContain("<script");
    expect(contentHtml).not.toContain("alert(");
    expect(contentHtml).not.toContain("onerror");
    expect(contentHtml).not.toContain("javascript:");
  });
});
