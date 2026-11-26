import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

export interface Config {
    accessToken?: string;
    refreshToken?: string;
    apiUrl?: string;
    storefrontUrl?: string;
    userId?: string;
}

/** The config file holds tokens, so only its owner can read and write it */
export const CONFIG_FILE_MODE = 0o600;
export const CONFIG_DIR_MODE = 0o700;

export class ConfigService {
    /** A different folder can be chosen with CRAFTER_CONFIG_DIR (for tests and CI) */
    static get configPath(): string {
        const dir = process.env.CRAFTER_CONFIG_DIR || path.join(os.homedir(), '.crafter');
        return path.join(dir, 'config.json');
    }

    private static defaultApiUrl = 'https://api.crafter.net.tr';
    private static defaultStorefrontUrl = 'https://origin.crafter.web.tr';

    static async getConfig(): Promise<Config> {
        try {
            if (await fs.pathExists(this.configPath)) {
                const config = await fs.readJson(this.configPath);
                return {
                    apiUrl: this.defaultApiUrl,
                    storefrontUrl: this.defaultStorefrontUrl,
                    ...config,
                };
            }
        } catch (error) {
            // Return default config if file is corrupted or unreadable
        }
        return { 
            apiUrl: this.defaultApiUrl,
            storefrontUrl: this.defaultStorefrontUrl
        };
    }

    /** Writes the config file with 0600 permissions; narrows the permissions if the file already exists with wider ones */
    private static async writeConfigFile(data: Config): Promise<void> {
        const configPath = this.configPath;
        await fs.ensureDir(path.dirname(configPath), { mode: CONFIG_DIR_MODE });
        await fs.writeJson(configPath, data, { spaces: 2, mode: CONFIG_FILE_MODE });
        // the mode in writeFile only applies to new files; fix the permissions of an existing file too
        await fs.chmod(configPath, CONFIG_FILE_MODE);
    }

    static async setConfig(config: Config): Promise<void> {
        const currentConfig = await this.getConfig();
        const newConfig = { ...currentConfig, ...config };
        await this.writeConfigFile(newConfig);
    }

    static async clearConfig(): Promise<void> {
        if (await fs.pathExists(this.configPath)) {
            const config = await this.getConfig();
            // Keep apiUrl and storefrontUrl, clear sensitive data
            await this.writeConfigFile({
                apiUrl: config.apiUrl,
                storefrontUrl: config.storefrontUrl,
            });
        }
    }

    static async resetConfig(): Promise<void> {
        if (await fs.pathExists(this.configPath)) {
            await fs.remove(this.configPath);
        }
    }



    static async getApiUrl(): Promise<string> {
        const config = await this.getConfig();
        return config.apiUrl || this.defaultApiUrl;
    }

    static async getStorefrontUrl(): Promise<string> {
        const config = await this.getConfig();
        return config.storefrontUrl || this.defaultStorefrontUrl;
    }
}
