// export-to-excel.mjs
// Exports stories in app-episodic format:
//   EP1 + EP2 → linear scenes
//   EP2 ends with choice row
//   EP3-6 → Branch A (left) | Branch B (right) side by side
//
// Usage: node export-to-excel.mjs stories-<timestamp>.json

import { readFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __dir = dirname(fileURLToPath(import.meta.url));
const jsonFile = process.argv[2];
if (!jsonFile) { console.error('Usage: node export-to-excel.mjs stories-<timestamp>.json'); process.exit(1); }

const stories = JSON.parse(readFileSync(join(__dir, jsonFile), 'utf8'));

const wb = XLSX.utils.book_new();

// ── Summary sheet ─────────────────────────────────────────────────────────────
const summaryRows = [['#', 'Title', 'Genre', 'City', 'Logline']];
stories.forEach((s, i) => summaryRows.push([i + 1, s.title, s.genre, s.city, s.logline]));
const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
summarySheet['!cols'] = [{ wch: 4 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 80 }];
XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

// ── Per-story sheets ──────────────────────────────────────────────────────────
for (const story of stories) {
  const rows = [];

  // Story header
  rows.push(['STORY', story.title, '', '', '', '', '']);
  rows.push(['Genre', story.genre, 'City', story.city, '', '', '']);
  rows.push(['Logline', story.logline, '', '', '', '', '']);
  rows.push([]);

  for (let epIdx = 0; epIdx < story.episodes.length; epIdx++) {
    const ep = story.episodes[epIdx];
    const epNum = epIdx + 1;

    if (ep.scenes) {
      // ── Linear episode (EP1 or EP2) ────────────────────────────────────────
      rows.push([`── EPISODE ${epNum} ──`, '', '', '', '', '', '']);
      rows.push(['Scene #', 'Headline', 'Dialog / Body', '', '', '', '']);

      ep.scenes.forEach((sc, scIdx) => {
        rows.push([scIdx + 1, sc.hl || '', sc.body || '', '', '', '', '']);
      });

      if (ep.choice) {
        rows.push([]);
        rows.push(['▶ CHOICE', ep.choice.q || '', '', '', '', '', '']);
        rows.push(['', 'Option A →', ep.choice.A?.text || ep.choice.A || '', '', '', '', '']);
        rows.push(['', 'Option B →', ep.choice.B?.text || ep.choice.B || '', '', '', '', '']);
      }

      rows.push([]);

    } else {
      // ── Branched episode (EP3-6) — A and B side by side ────────────────────
      rows.push([`── EPISODE ${epNum} ──`, '', '', '', '', '', '']);
      rows.push(['', '── BRANCH A ──', '', '', '', '── BRANCH B ──', '']);
      rows.push(['Scene #', 'Headline A', 'Dialog A', '', 'Scene #', 'Headline B', 'Dialog B']);

      const scenesA = ep.scenesA || [];
      const scenesB = ep.scenesB || [];
      const maxScenes = Math.max(scenesA.length, scenesB.length);

      for (let scIdx = 0; scIdx < maxScenes; scIdx++) {
        const scA = scenesA[scIdx];
        const scB = scenesB[scIdx];
        rows.push([
          scA ? scIdx + 1 : '', scA?.hl || '', scA?.body || '',
          '',
          scB ? scIdx + 1 : '', scB?.hl || '', scB?.body || '',
        ]);
      }

      rows.push([]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },  // Scene # / label
    { wch: 28 },  // Headline A
    { wch: 70 },  // Body A
    { wch: 4  },  // spacer
    { wch: 10 },  // Scene # B
    { wch: 28 },  // Headline B
    { wch: 70 },  // Body B
  ];

  const sheetName = story.title.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const outName = basename(jsonFile, '.json') + '.xlsx';
const outPath = join(__dir, outName);
XLSX.writeFile(wb, outPath);
console.log('Excel saved:', outPath);
