import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StylistHandler } from './stylistHandler.js';
import { PipelineStep } from '../../types.js';

// Mock AI
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

describe('StylistHandler Baseline', () => {
  let handler: StylistHandler;
  const state: any = {
    section_7_8_publisher: { 
      semantic_markdown: "<div>Base HTML</div>",
      vtt_section: "VTT Callouts"
    },
    mcd: { premise: { tone_guardrails: "Dark Fantasy" } }
  };

  const setup: any = {
    gmOverrides: {},
    gmNotes: "",
    gmConcerns: ""
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new StylistHandler(mockAi as any);
  });

  it('should generate a valid styled output JSON', async () => {
    const longHtml = `
      <div class="header-container"><h1>Encounter Title</h1></div>
      <div class="balance-badge">Action Budget: 10</div>
      <div class="stat-block">⚔️ Monster Stats</div>
      <div class="tactical-grid">Map Data</div>
      <div class="sensory-grid">👁️ Sight: Dim light</div>
      <p>${"Visceral description. ".repeat(100)}</p>
    `;

    const jsonResponse = JSON.stringify({
      chain_of_thought_scratchpad: "Analysis of the prestige pass.",
      styled_output: longHtml,
      vtt_section: "Updated VTT 💡"
    });

    mockAi.models.generateContent.mockResolvedValue({ text: jsonResponse });

    const result = await handler.execute(state, setup);

    expect(result.section_9_10_stylist).toBeDefined();
    expect(result.section_9_10_stylist.styled_output).toContain("header-container");
    expect(result.section_9_10_stylist.styled_output.length).toBeGreaterThan(1500);
  });

  it('should fail if mandatory CSS classes are missing', async () => {
    const invalidHtml = "<div>No classes here</div>";
    const jsonResponse = JSON.stringify({
      chain_of_thought_scratchpad: "Lazy pass.",
      styled_output: invalidHtml
    });

    mockAi.models.generateContent.mockResolvedValue({ text: jsonResponse });

    await expect(handler.execute(state, setup)).rejects.toThrow(/\[SCHEMA_VIOLATION\] Styled output is missing mandatory CSS components/);
  });

  it('should fail if output is too brief (character floor)', async () => {
    const briefHtml = `
      <div class="header-container"></div>
      <div class="balance-badge"></div>
      <div class="stat-block">⚔️</div>
      <div class="tactical-grid"></div>
      <div class="sensory-grid">👁️</div>
    `;
    const jsonResponse = JSON.stringify({
      chain_of_thought_scratchpad: "Too short.",
      styled_output: briefHtml
    });

    mockAi.models.generateContent.mockResolvedValue({ text: jsonResponse });

    await expect(handler.execute(state, setup)).rejects.toThrow(/too brief/);
  });

  it('should fail if iconography is missing', async () => {
    const noIconsHtml = `
      <div class="header-container">Title</div>
      <div class="balance-badge">Budget</div>
      <div class="stat-block">Stats</div>
      <div class="tactical-grid">Grid</div>
      <div class="sensory-grid">Sight</div>
      <p>${"Visceral description. ".repeat(100)}</p>
    `;
    const jsonResponse = JSON.stringify({
      chain_of_thought_scratchpad: "No icons.",
      styled_output: noIconsHtml
    });

    mockAi.models.generateContent.mockResolvedValue({ text: jsonResponse });

    await expect(handler.execute(state, setup)).rejects.toThrow(/failed Iconography Enforcement/);
  });
});
