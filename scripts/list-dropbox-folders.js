import { Dropbox } from 'dropbox';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Get the Dropbox access token from environment variable or command line argument
const accessToken = process.env.DROPBOX_ACCESS_TOKEN || process.argv[2];

if (!accessToken) {
  console.error('❌ Error: No Dropbox access token provided.');
  console.error('Usage: DROPBOX_ACCESS_TOKEN=your_token node scripts/list-dropbox-folders.js');
  console.error('   OR: node scripts/list-dropbox-folders.js your_token');
  process.exit(1);
}

const dbx = new Dropbox({ accessToken });

async function listSubfolders() {
  try {
    const targetFolder = '/00_Art Aurea Alle Ausgaben';
    console.log(`🔍 Fetching ALL nested subfolders from: ${targetFolder}\n`);

    // Helper to handle retries on transient errors
    const withRetry = async (fn, label) => {
      const max = 5;
      let attempt = 0;
      let delay = 500; // ms
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          return await fn();
        } catch (err) {
          attempt++;
          const status = err?.status || err?.statusCode;
          const canRetry = status === 429 || status >= 500;
          if (!canRetry || attempt >= max) {
            throw err;
          }
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 2, 8000);
        }
      }
    };

    // Use recursive listing to get all nested folders and handle pagination with retries
    let response = await withRetry(() => dbx.filesListFolder({ path: targetFolder, recursive: true }), 'list-root');
    const allEntries = [...response.result.entries];
    while (response.result.has_more) {
      response = await withRetry(() => dbx.filesListFolderContinue({ cursor: response.result.cursor }), 'list-continue');
      allEntries.push(...response.result.entries);
    }

    // Split folders and files
    const folderEntries = allEntries.filter(e => e['.tag'] === 'folder' && e.path_display);
    const fileEntries = allEntries.filter(e => e['.tag'] === 'file' && e.path_display);

    // Map to structured rows with level and parent based on relative path
    const base = targetFolder.replace(/\/$/, '');
    const rows = folderEntries.map(f => {
      const fullPath = f.path_display;
      const rel = fullPath.startsWith(base + '/') ? fullPath.slice(base.length + 1) : fullPath;
      const parts = rel.split('/');
      const level = parts.length; // 1 = immediate child
      const name = parts[parts.length - 1];
      const parent = parts.length > 1 ? parts[parts.length - 2] : '';
      return { level, parent, name, path: fullPath };
    });

    // Sort by path for stable output
    rows.sort((a, b) => a.path.localeCompare(b.path, 'de'));

    // Pretty print
    const outputPath = join(process.cwd(), 'reports', 'dropbox-artaurea-folders-deep.txt');
    const content = rows.map(r => `${'  '.repeat(r.level - 1)}${r.name}`).join('\n');
    writeFileSync(outputPath, content, 'utf-8');
    console.log(`✅ Deep folder list saved to: ${outputPath}`);

    // CSV export
    const csvPath = join(process.cwd(), 'reports', 'dropbox-artaurea-folders-deep.csv');
    const header = 'level,parent,folder_name,full_path';
    const csvContent = [header, ...rows.map(r => `${r.level},"${r.parent}","${r.name}","${r.path}"`)].join('\n');
    writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`✅ CSV version saved to: ${csvPath}`);

    // Files export (CSV + TXT)
    const filesCsvPath = join(process.cwd(), 'reports', 'dropbox-artaurea-files-deep.csv');
    const filesHeader = 'full_path,name,ext,size,client_modified,server_modified';
    const filesRows = fileEntries
      .map(f => {
        const fullPath = f.path_display || '';
        const name = f.name || '';
        const dot = name.lastIndexOf('.');
        const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
        const size = f.size ?? '';
        const clientModified = f.client_modified || '';
        const serverModified = f.server_modified || '';
        const q = v => `"${String(v).replace(/"/g, '""')}"`;
        return [q(fullPath), q(name), q(ext), size, q(clientModified), q(serverModified)].join(',');
      });
    const filesCsv = [filesHeader, ...filesRows].join('\n');
    writeFileSync(filesCsvPath, filesCsv, 'utf-8');
    console.log(`✅ Files CSV saved to: ${filesCsvPath} (count: ${fileEntries.length})`);

    const filesTxtPath = join(process.cwd(), 'reports', 'dropbox-artaurea-files-deep.txt');
    const filesTxt = fileEntries.map(f => f.path_display).join('\n');
    writeFileSync(filesTxtPath, filesTxt, 'utf-8');
    console.log(`✅ Files TXT saved to: ${filesTxtPath}`);

    // Quick console summary
    const byLevel = rows.reduce((acc, r) => { acc[r.level] = (acc[r.level] || 0) + 1; return acc; }, {});
    console.log('📊 Folders by level:', byLevel);

    // Names-only unique list
    const namesOnly = Array.from(new Set(rows.map(r => r.name))).sort((a, b) => a.localeCompare(b, 'de'));
    const namesTxt = join(process.cwd(), 'reports', 'dropbox-artaurea-folder-names.txt');
    writeFileSync(namesTxt, namesOnly.join('\n'), 'utf-8');
    const namesCsv = join(process.cwd(), 'reports', 'dropbox-artaurea-folder-names.csv');
    writeFileSync(namesCsv, ['folder_name', ...namesOnly.map(n => `"${n}"`)].join('\n'), 'utf-8');
    console.log(`✅ Names-only exports saved to: ${namesTxt} and ${namesCsv}`);

    return rows;
  } catch (error) {
    console.error('❌ Error listing folders:', error.message);
    if (error.error) {
      console.error('Details:', JSON.stringify(error.error, null, 2));
    }
    process.exit(1);
  }
}

listSubfolders();

