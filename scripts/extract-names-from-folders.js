import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function isAllUppercase(word) {
  return /^[A-ZÄÖÜẞ\-]+$/.test(word);
}

function isLikelyNameToken(token) {
  // Allow diacritics, hyphens; reject tokens with digits or very short
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüẞß\-]+$/.test(token)) return false;
  if (token.length < 2) return false;
  return true;
}

function capitalizeWord(word) {
  return word
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');
}

function extractCandidatesFromLine(line) {
  const results = [];
  const original = line;

  // Remove obvious prefixes like dates and AA markers: 2024_AA58_, 2019_AA37_, etc.
  let cleaned = line.replace(/^\d{4}_(AA\d{1,2}_)*/i, '');
  cleaned = cleaned.replace(/^AA\s?-?\d{1,2}[-_]?\d{0,4}/i, '');

  // 1) UPPERCASE_UNDERSCORE patterns: e.g., VIGELAND_TONE, BRUNNER_PETZOLD, BOKYUNG_MINSOO
  if (/^[A-ZÄÖÜẞ0-9_\-]+$/.test(cleaned) && cleaned.includes('_')) {
    const tokens = cleaned
      .split('_')
      .map(t => t.trim())
      .filter(t => t && isLikelyNameToken(t) && !/^AA\d*$/i.test(t) && !/^\d+$/.test(t));
    if (tokens.length >= 2 && tokens.length <= 4) {
      const name = tokens.map(capitalizeWord).join(' ');
      results.push({ original, name, method: 'underscore_upper' });
    } else if (tokens.length === 1 && isAllUppercase(tokens[0])) {
      // Single token surname
      results.push({ original, name: capitalizeWord(tokens[0]), method: 'underscore_upper_single' });
    }
  }

  // 2) Proper Case words: look for 2-3 consecutive TitleCase tokens
  const properMatch = cleaned.match(/\b([A-ZÄÖÜ][a-zäöüßà-öø-ÿ]+)(?:[\s\-]+([A-ZÄÖÜ][a-zäöüßà-öø-ÿ]+)){1,2}\b/);
  if (properMatch) {
    const phrase = properMatch[0];
    const parts = phrase.split(/[\s\-]+/).filter(isLikelyNameToken);
    if (parts.length >= 2 && parts.length <= 4) {
      const name = parts.map(capitalizeWord).join(' ');
      results.push({ original, name, method: 'proper_case' });
    }
  }

  // 3) LAST_FIRST in uppercase without underscores but with spaces: e.g., "MUELLER FELIX"
  if (/^[A-ZÄÖÜẞ\s\-]+$/.test(cleaned) && cleaned.includes(' ')) {
    const tokens = cleaned
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t && isLikelyNameToken(t) && !/^AA\d*$/i.test(t) && !/^\d+$/.test(t));
    if (tokens.length >= 2 && tokens.length <= 4) {
      const name = tokens.map(capitalizeWord).join(' ');
      results.push({ original, name, method: 'upper_space' });
    }
  }

  return results;
}

function extractNamesFromFilename(name) {
  const results = [];
  const base = name.replace(/\.[^.]+$/, ''); // drop extension

  // Pattern A: optional index, underscore, Name Parts, underscore marker (IMG,JPG,TIFF etc.)
  // e.g., 4_Helena Schepens_IMG
  const a = base.match(/^(?:\d+_)?([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüẞß\-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüẞß\-]+){1,3})_(?:IMG|IMAGE|FOTO|BILD|PIC|SCAN|RGB|CMYK|JPG|JPEG|TIFF|PNG|WEB|KLEIN|GROSS|SMALL|LARGE)\b/i);
  if (a) {
    const phrase = a[1].trim();
    const parts = phrase.split(/\s+/).filter(isLikelyNameToken);
    if (parts.length >= 2 && parts.length <= 4) {
      results.push({ original: name, name: parts.map(capitalizeWord).join(' '), method: 'file_pattern_a' });
    }
  }

  // Pattern B: tokens separated by underscores and numbers, take a middle Proper Name run
  const tokens = base.split('_').filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].replace(/^\d+$/, '');
    if (!t) continue;
    // Allow spaces inside token too (if base had spaces)
    const candidate = tokens.slice(i, i + 3).join(' ').replace(/[_-]+/g, ' ').trim();
    const proper = candidate.match(/\b([A-ZÄÖÜ][a-zäöüßà-öø-ÿ]+)(?:\s+([A-ZÄÖÜ][a-zäöüßà-öø-ÿ]+)){1,3}\b/);
    if (proper) {
      const phrase = proper[0];
      const parts = phrase.split(/\s+/).filter(isLikelyNameToken);
      if (parts.length >= 2 && parts.length <= 4) {
        results.push({ original: name, name: parts.map(capitalizeWord).join(' '), method: 'file_pattern_b' });
        break;
      }
    }
  }

  return results;
}

function main() {
  const inputPath = process.argv[2] || join(process.cwd(), 'reports', 'dropbox-artaurea-folder-names.txt');
  const filesCsvPath = join(process.cwd(), 'reports', 'dropbox-artaurea-files-deep.csv');
  const outCsv = join(process.cwd(), 'reports', 'extracted-person-names.csv');
  const outTxt = join(process.cwd(), 'reports', 'extracted-person-names.txt');
  const outFilesCsv = join(process.cwd(), 'reports', 'extracted-person-names-from-files.csv');
  const outMergedTxt = join(process.cwd(), 'reports', 'extracted-person-names-merged.txt');

  const text = readFileSync(inputPath, 'utf-8');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const seenPairs = new Set();
  const nameSet = new Set();
  const rows = [];

  for (const line of lines) {
    const candidates = extractCandidatesFromLine(line);
    for (const c of candidates) {
      const key = `${c.original}::${c.name}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      nameSet.add(c.name);
      rows.push(c);
    }
  }

  // Files-based extraction
  let filesCsv = '';
  try { filesCsv = readFileSync(filesCsvPath, 'utf-8'); } catch {}
  const filesRows = filesCsv.split(/\r?\n/);
  const fileNameColIdx = 1; // full_path,name,ext,size,... => name is idx 1
  const fileNames = [];
  for (let i = 1; i < filesRows.length; i++) {
    const row = filesRows[i];
    if (!row) continue;
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < row.length; j++) {
      const ch = row[j];
      if (ch === '"') {
        if (inQuotes && row[j + 1] === '"') { current += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current); current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    const name = cols[fileNameColIdx] || '';
    const stripped = name.replace(/^"|"$/g, '');
    if (stripped) fileNames.push(stripped);
  }

  const filesResults = [];
  const filesNameSet = new Set();
  for (const fname of fileNames) {
    const cands = extractNamesFromFilename(fname);
    for (const c of cands) {
      const key = `${c.original}::${c.name}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      filesResults.push(c);
      filesNameSet.add(c.name);
    }
  }

  // Write CSV with mappings (folders only)
  const header = 'original_folder,name,method';
  const csv = [header, ...rows.map(r => `"${r.original.replace(/"/g, '""')}","${r.name.replace(/"/g, '""')}",${r.method}`)].join('\n');
  writeFileSync(outCsv, csv, 'utf-8');

  // Write files CSV with mappings
  const fHeader = 'original_filename,name,method';
  const fCsv = [fHeader, ...filesResults.map(r => `"${r.original.replace(/"/g, '""')}","${r.name.replace(/"/g, '""')}",${r.method}`)].join('\n');
  writeFileSync(outFilesCsv, fCsv, 'utf-8');

  // Write unique names TXT (folders only)
  const uniqueNames = Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'de'));
  writeFileSync(outTxt, uniqueNames.join('\n'), 'utf-8');

  // Write merged unique names (folders + files)
  const merged = Array.from(new Set([...uniqueNames, ...Array.from(filesNameSet)])).sort((a, b) => a.localeCompare(b, 'de'));
  writeFileSync(outMergedTxt, merged.join('\n'), 'utf-8');

  console.log(`✅ Folder-derived unique names: ${uniqueNames.length}`);
  console.log(`✅ File-derived unique names: ${filesNameSet.size}`);
  console.log(`✅ Merged unique names: ${merged.length}`);
  console.log(`✅ Saved folder CSV: ${outCsv}`);
  console.log(`✅ Saved files CSV: ${outFilesCsv}`);
  console.log(`✅ Saved merged names: ${outMergedTxt}`);
}

main();


