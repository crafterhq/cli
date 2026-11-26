import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Single shared ignore and allow list for theme files.
 * ZIP sync (dev, push), packaging (pack) and the watcher (dev watch) use the same rules.
 *
 * Matches the server rules (backend: src/modules/website/v2/theme/theme-file-path.ts):
 * allowed extensions, a 10 MB per-file limit and file path validation.
 */

/** Folders ignored at every level (all folders starting with a dot are ignored too) */
export const IGNORED_DIRECTORIES = ['node_modules', 'dist'];

/** File names ignored at every level (all files starting with a dot are ignored too) */
export const IGNORED_FILE_NAMES = ['desktop.ini', 'Thumbs.db'];

/** Ignored extensions */
export const IGNORED_EXTENSIONS = ['.zip'];

/** Files kept only locally: the server skips these during sync anyway */
export const LOCAL_ONLY_FILES = ['crafter-manifest.json'];

/** Theme file extensions the server accepts */
export const ALLOWED_THEME_EXTENSIONS = {
    assets: ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.gif', '.ico'],
    core: ['.liquid', '.json', '.html'],
};

/** Upper limit the server accepts for a single file (10 MB) */
export const MAX_THEME_FILE_BYTES = 10 * 1024 * 1024;

const MAX_THEME_FILE_KEY_LENGTH = 512;

/** Converts an absolute file path to a relative, "/"-separated key inside the theme */
export function toThemeKey(projectDir: string, filePath: string): string {
    return path.relative(projectDir, filePath).split(path.sep).join('/');
}

/**
 * Should the relative path (file or folder) be ignored entirely?
 * Hidden files/folders (.env, .git, .crafter, .DS_Store ...), node_modules, dist, .zip, etc.
 */
export function isIgnoredPath(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, '/');
    if (!normalized || normalized === '.') return false;
    const parts = normalized.split('/').filter((p) => p.length > 0);
    for (const part of parts) {
        if (part === '..') continue;
        if (part.startsWith('.')) return true;
        if (IGNORED_DIRECTORIES.includes(part)) return true;
        if (IGNORED_FILE_NAMES.includes(part)) return true;
    }
    const ext = path.extname(normalized).toLowerCase();
    return IGNORED_EXTENSIONS.includes(ext);
}

export function isAllowedThemeExtension(relPath: string): boolean {
    const ext = path.extname(relPath).toLowerCase();
    return ALLOWED_THEME_EXTENSIONS.assets.includes(ext) || ALLOWED_THEME_EXTENSIONS.core.includes(ext);
}

export type SkipReason = 'extension' | 'size' | 'path';

export interface SkippedFile {
    key: string;
    reason: SkipReason;
}

/**
 * Can the file be uploaded to the server? Returns the reason if not.
 * (Ignored and local-only files are filtered out before this check.)
 */
export function getUploadSkipReason(key: string, sizeBytes?: number): SkipReason | null {
    // eslint-disable-next-line no-control-regex
    if (key.length > MAX_THEME_FILE_KEY_LENGTH || /[\u0000-\u001f\u007f%\\]/.test(key)) return 'path';
    if (!isAllowedThemeExtension(key)) return 'extension';
    if (sizeBytes !== undefined && sizeBytes > MAX_THEME_FILE_BYTES) return 'size';
    return null;
}

export function describeSkipReason(reason: SkipReason): string {
    switch (reason) {
        case 'extension':
            return 'file type not allowed by the server';
        case 'size':
            return 'file exceeds the 10 MB limit';
        case 'path':
            return 'invalid or too long file path';
    }
}

export interface CollectOptions {
    /** For pack: whether crafter-manifest.json is included in the package */
    includeLocalOnly?: boolean;
}

export interface CollectResult {
    /** Relative keys of the files to upload (sorted) */
    files: string[];
    /** Files skipped because of the allow list or size */
    skipped: SkippedFile[];
}

/**
 * Collects the theme files in the project folder using the shared rules.
 * Symbolic links are not followed (so files outside the project do not end up in the package).
 */
export async function collectThemeFiles(projectDir: string, options: CollectOptions = {}): Promise<CollectResult> {
    const files: string[] = [];
    const skipped: SkippedFile[] = [];

    const walk = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const abs = path.join(dir, entry.name);
            const key = toThemeKey(projectDir, abs);
            if (isIgnoredPath(key)) continue;
            if (entry.isDirectory()) {
                await walk(abs);
                continue;
            }
            if (!entry.isFile()) continue;
            if (LOCAL_ONLY_FILES.includes(key) && !options.includeLocalOnly) continue;

            const stat = await fs.stat(abs);
            const reason = getUploadSkipReason(key, stat.size);
            if (reason) {
                skipped.push({ key, reason });
                continue;
            }
            files.push(key);
        }
    };

    await walk(projectDir);
    files.sort();
    skipped.sort((a, b) => a.key.localeCompare(b.key));
    return { files, skipped };
}

/** Short warning lines for skipped files (summarized if there are too many) */
export function formatSkippedFiles(skipped: SkippedFile[], limit = 10): string[] {
    const lines = skipped.slice(0, limit).map((s) => `  - ${s.key}: ${describeSkipReason(s.reason)}`);
    if (skipped.length > limit) {
        lines.push(`  ... and ${skipped.length - limit} more`);
    }
    return lines;
}
