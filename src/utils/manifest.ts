import * as path from 'path';
import * as fs from 'fs-extra';

export const MANIFEST_FILE = 'crafter-manifest.json';

export type Manifest = Record<string, any>;

export type ReadManifestResult =
    | { status: 'missing' }
    | { status: 'invalid'; error: string }
    | { status: 'ok'; manifest: Manifest };

export async function readLocalManifest(projectDir: string): Promise<ReadManifestResult> {
    const manifestPath = path.join(projectDir, MANIFEST_FILE);
    if (!(await fs.pathExists(manifestPath))) return { status: 'missing' };
    try {
        const manifest = await fs.readJson(manifestPath);
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
            return { status: 'invalid', error: 'not a JSON object' };
        }
        return { status: 'ok', manifest };
    } catch (e: any) {
        return { status: 'invalid', error: e?.message || String(e) };
    }
}

function isMissing(value: unknown): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Merges the local manifest with the server manifest: only top-level fields missing locally (absent, null or empty)
 * are filled. Local values (including themeVersion) never change.
 */
export function mergeManifest(local: Manifest, server: Manifest): { merged: Manifest; added: string[] } {
    const merged: Manifest = { ...local };
    const added: string[] = [];
    for (const [key, value] of Object.entries(server || {})) {
        if (isMissing(value)) continue;
        if (isMissing(merged[key])) {
            merged[key] = value;
            added.push(key);
        }
    }
    return { merged, added };
}

export interface ManifestSyncOptions {
    /** Asks the user a yes/no question */
    confirm: (message: string, defaultValue: boolean) => Promise<boolean>;
    /** Whether this is an interactive terminal (if not, the file is never written) */
    interactive: boolean;
    log: (message: string) => void;
    /**
     * Default answer to the update question when the local marketplaceThemeId differs.
     * true in init, since the user just picked the theme; false in dev/publish.
     */
    preferThemeId?: boolean;
}

export type ManifestSyncOutcome = 'unchanged' | 'created' | 'updated' | 'declined' | 'skipped-non-interactive' | 'invalid';

/**
 * Safely syncs crafter-manifest.json with the server manifest.
 * - The server manifest never overwrites the local file.
 * - The server manifest is only used to fill missing fields.
 * - The file is written only if the user confirms.
 */
export async function syncManifest(
    projectDir: string,
    themeId: string,
    fetchServerManifest: () => Promise<Manifest | null>,
    options: ManifestSyncOptions,
): Promise<ManifestSyncOutcome> {
    const manifestPath = path.join(projectDir, MANIFEST_FILE);
    const local = await readLocalManifest(projectDir);

    if (local.status === 'invalid') {
        options.log(`Could not read ${MANIFEST_FILE} (${local.error}); the file was left untouched.`);
        return 'invalid';
    }

    let server: Manifest = {};
    try {
        const data = await fetchServerManifest();
        if (data && typeof data === 'object' && !Array.isArray(data)) server = data;
    } catch {
        // If the server manifest cannot be fetched, continue with the theme ID only
    }
    const serverWithId: Manifest = { marketplaceThemeId: themeId, ...server };

    if (local.status === 'missing') {
        if (!options.interactive) {
            options.log(`${MANIFEST_FILE} not found; not created in non-interactive mode.`);
            return 'skipped-non-interactive';
        }
        const ok = await options.confirm(
            `${MANIFEST_FILE} not found. Create it from the server data?`,
            true,
        );
        if (!ok) return 'declined';
        await fs.writeJson(manifestPath, serverWithId, { spaces: 2 });
        return 'created';
    }

    const { merged, added } = mergeManifest(local.manifest, serverWithId);

    // If the local manifest points to another theme, the ID is updated only if the user confirms
    const localId = local.manifest.marketplaceThemeId;
    const idMismatch = typeof localId === 'string' && localId.trim() !== '' && localId.trim() !== themeId;
    let idChanged = false;
    if (idMismatch) {
        options.log(`${MANIFEST_FILE} points to another theme (marketplaceThemeId: ${localId}, in use: ${themeId}).`);
        if (options.interactive) {
            idChanged = await options.confirm(
                `Update marketplaceThemeId in ${MANIFEST_FILE} to ${themeId}? Other fields are kept.`,
                options.preferThemeId ?? false,
            );
            if (idChanged) merged.marketplaceThemeId = themeId;
        }
        // If the ID did not change, server data of another theme is not added to this manifest
        if (!idChanged) return 'unchanged';
    }

    if (added.length === 0) {
        if (!idChanged) return 'unchanged';
        await fs.writeJson(manifestPath, merged, { spaces: 2 });
        return 'updated';
    }

    if (!options.interactive) {
        options.log(`Missing fields in ${MANIFEST_FILE} (${added.join(', ')}); not written in non-interactive mode.`);
        return 'skipped-non-interactive';
    }

    const ok = await options.confirm(
        `Fill the missing fields in ${MANIFEST_FILE} from the server? (${added.join(', ')}) Existing fields are kept.`,
        true,
    );
    if (!ok) {
        if (!idChanged) return 'declined';
        await fs.writeJson(manifestPath, { ...local.manifest, marketplaceThemeId: themeId }, { spaces: 2 });
        return 'updated';
    }
    await fs.writeJson(manifestPath, merged, { spaces: 2 });
    return 'updated';
}

/** For commands: fetches the server manifest through the API and syncs the local manifest with confirmation */
export async function syncManifestWithApi(
    projectDir: string,
    themeId: string,
    api: any,
    log: (message: string) => void,
    preferThemeId = false,
): Promise<ManifestSyncOutcome> {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    return syncManifest(
        projectDir,
        themeId,
        async () => {
            const res = await api.get(`/marketplace/themes/${themeId}/manifest`);
            return res?.data ?? null;
        },
        {
            interactive,
            log,
            preferThemeId,
            confirm: async (message, defaultValue) => {
                const { confirm } = await import('@inquirer/prompts');
                return confirm({ message, default: defaultValue });
            },
        },
    );
}
