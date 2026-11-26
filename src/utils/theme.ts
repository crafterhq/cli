import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Resolves the theme ID from the theme folder or the flag.
 * Priority:
 * 1. Argument passed on the CLI (--theme / -t)
 * 2. crafter-manifest.json (marketplaceThemeId || themeId || id)
 * 3. .crafter file (themeId)
 * 4. theme.config.js (for compatibility with the old layout)
 */
export async function resolveThemeId(projectDir: string, cliThemeId?: string): Promise<string | undefined> {
    if (cliThemeId && cliThemeId.trim().length > 0) {
        return cliThemeId.trim();
    }

    // 1. crafter-manifest.json check
    const manifestPath = path.join(projectDir, 'crafter-manifest.json');
    if (await fs.pathExists(manifestPath)) {
        try {
            const manifest = await fs.readJson(manifestPath);
            const id = manifest.marketplaceThemeId || manifest.themeId || manifest.id;
            if (id && typeof id === 'string') {
                return id.trim();
            }
        } catch (e) {}
    }

    // 2. .crafter file check
    const dotCrafterPath = path.join(projectDir, '.crafter');
    if (await fs.pathExists(dotCrafterPath)) {
        try {
            const dotCrafter = await fs.readJson(dotCrafterPath);
            if (dotCrafter.themeId && typeof dotCrafter.themeId === 'string') {
                return dotCrafter.themeId.trim();
            }
        } catch (e) {}
    }

    // 3. theme.config.js check (legacy compatibility)
    const localConfigPath = path.join(projectDir, 'theme.config.js');
    if (await fs.pathExists(localConfigPath)) {
        try {
            delete require.cache[require.resolve(localConfigPath)];
            const localConfig = require(localConfigPath);
            if (localConfig.themeId && typeof localConfig.themeId === 'string') {
                return localConfig.themeId.trim();
            }
        } catch (e) {}
    }

    return undefined;
}
