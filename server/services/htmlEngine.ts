import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import { sanitizeHtml } from '../../src/utils/sanitizeHtml.js';

/**
 * generateStandaloneHtml
 * 
 * Takes the styled content and wraps it in the Grimoire template.
 * Injects necessary scripts for offline resilience and interactivity.
 */
export async function generateStandaloneHtml(content: string, jobId: string, obsidianMarkdown: string, jobData?: any): Promise<string> {
  const templatePath = path.join(process.cwd(), 'Base', 'template.html');
  let html = await fs.readFile(templatePath, 'utf-8');

  // Convert Markdown to HTML
  let parsedContent = await marked.parse(content);

  // PRESTIGE PASS: Inject Drop-Cap into the first paragraph
  if (parsedContent.includes('<p>')) {
    parsedContent = parsedContent.replace('<p>', '<p class="drop-cap">');
  }

  // --- STATE-MACHINE PARSER: Robust Stat-Block Wrapping ---
  const SUBHEADER_WHITELIST = ['action', 'trait', 'legendary', 'reaction', 'bonus', 'lair', 'spell', 'description', 'stat', 'ability'];
  const GLOBAL_ANCHORS = ['tactical', 'hazards', 'vtt', 'obsidian', 'notes', 'summary', 'background', 'hook'];
  const MECHANICAL_KEYWORDS = ['armor class', 'hit points', 'speed', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'saving throws', 'skills', 'senses', 'languages', 'challenge', 'damage resistances', 'damage immunities', 'condition immunities', 'vulnerabilities'];
  
  const lines = parsedContent.split('\n');
  let inStatBlock = false;
  let sparseCount = 0;
  let processedLines: string[] = [];

  const getCleanText = (str: string) => str.replace(/<[^>]*>/g, '').toLowerCase().trim();
  const hasMechanics = (str: string) => {
    const clean = getCleanText(str);
    const hasDice = /\d+d\d+/.test(clean);
    const hasKeywords = MECHANICAL_KEYWORDS.some(k => clean.includes(k));
    // Support both colons and periods for trait/action headers
    const hasBoldKey = /<strong>(.*?)[.:]<\/strong>/.test(str) || /<b>(.*?)[.:]<\/b>/.test(str);
    return hasDice || hasKeywords || hasBoldKey;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      processedLines.push(line);
      continue;
    }

    const isHeader = line.startsWith('<h2') || line.startsWith('<h3') || line.startsWith('<h4');
    const cleanLine = getCleanText(line);

    // 1. Boundary Exit Detection
    if (inStatBlock && isHeader) {
      const isSubheader = SUBHEADER_WHITELIST.some(h => cleanLine.includes(h));
      const isGlobalAnchor = GLOBAL_ANCHORS.some(a => cleanLine.includes(a));

      if (isGlobalAnchor || !isSubheader) {
        processedLines.push('</div>');
        inStatBlock = false;
        sparseCount = 0;
      }
    }

    // 2. Start Detection (Handles back-to-back blocks in same iteration)
    if (!inStatBlock && isHeader) {
      // Lookahead check for mechanics to confirm this is a monster/stat header
      const lookahead = lines.slice(i + 1, i + 8).join(' ');
      if (hasMechanics(lookahead)) {
        processedLines.push('<div class="stat-block">');
        inStatBlock = true;
        sparseCount = 0;
      }
    }

    // 3. Narrative Drift Monitoring (Block-Aware)
    if (inStatBlock && !isHeader) {
      const isMechanical = hasMechanics(line);
      
      if (isMechanical) {
        sparseCount = 0; // Reset on any mechanical line (paragraph, list item, etc.)
      } else if (line.endsWith('</p>')) {
        // Only increment drift counter on complete paragraphs that lack mechanics
        sparseCount++;
        if (sparseCount >= 2) {
          processedLines.push('</div>');
          inStatBlock = false;
          sparseCount = 0;
        }
      }
    }

    processedLines.push(line);
  }

  if (inStatBlock) processedLines.push('</div>');
  parsedContent = processedLines.join('\n');

  // --- GM INTELLIGENCE: Section Wrapping ---
  parsedContent = parsedContent
    .replace(/<!-- TACTICAL BRIEFING START -->/g, '<div class="tactical-briefing">')
    .replace(/<!-- TACTICAL BRIEFING END -->/g, '</div>')
    .replace(/<!-- MECHANICAL APPENDIX START -->/g, '<div class="mechanical-appendix">')
    .replace(/<!-- MECHANICAL APPENDIX END -->/g, '</div>');

  parsedContent = sanitizeHtml(parsedContent);

  // Injected Variables
  const title = jobData?.mcd?.premise?.setting || "Encounter Module";
  const level = jobData?.mcd?.party?.avg_level || "--";
  const difficulty = jobData?.mcd?.parameters?.target_difficulty || "--";
  const metaStr = `Level ${level} • ${difficulty}`;

  // Inject the content into the template
  html = html.split('{{ content }}').join(parsedContent);

  // Update title for the specific encounter
  html = html.replace('<title>Encounter Factory | Grimoire Module</title>', `<title>Grimoire | ${title}</title>`);

  // Inject data for the client-side script
  const escapedMarkdown = obsidianMarkdown.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  
  html = html.replace('{{ obsidian_markdown }}', escapedMarkdown);
  html = html.replace('{{ job_id }}', jobId);
  html = html.replace('{{ encounter_title }}', title);
  html = html.replace('{{ encounter_meta }}', metaStr);
  html = html.replace('{{ difficulty_badge }}', difficulty.toUpperCase());

  return html;
}
