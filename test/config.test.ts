import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigService } from '../src/services/config.service';
import { makeTempDir } from './helpers';

const isWindows = process.platform === 'win32';
let dir: string;
const prevEnv = process.env.CRAFTER_CONFIG_DIR;

beforeAll(async () => {
    dir = path.join(await makeTempDir(), 'nested', '.crafter');
    process.env.CRAFTER_CONFIG_DIR = dir;
});

afterAll(async () => {
    if (prevEnv === undefined) delete process.env.CRAFTER_CONFIG_DIR;
    else process.env.CRAFTER_CONFIG_DIR = prevEnv;
    await fs.remove(path.dirname(path.dirname(dir)));
});

const mode = async (p: string) => (await fs.stat(p)).mode & 0o777;

describe.skipIf(isWindows)('ConfigService file permissions', () => {
    it('creates a new config file with 0600 and the folder with 0700', async () => {
        await ConfigService.setConfig({ accessToken: 'test-access', refreshToken: 'test-refresh' });
        const file = path.join(dir, 'config.json');
        expect(ConfigService.configPath).toBe(file);
        expect(await mode(file)).toBe(0o600);
        expect(await mode(dir)).toBe(0o700);
        expect((await fs.readJson(file)).accessToken).toBe('test-access');
    });

    it('sets 0600 when writing an existing file with wider permissions', async () => {
        const file = path.join(dir, 'config.json');
        await fs.chmod(file, 0o644);
        await ConfigService.setConfig({ accessToken: 'test-access-2' });
        expect(await mode(file)).toBe(0o600);
    });

    it('clearConfig keeps 0600 and removes the token fields', async () => {
        const file = path.join(dir, 'config.json');
        await fs.chmod(file, 0o666);
        await ConfigService.clearConfig();
        expect(await mode(file)).toBe(0o600);
        const data = await fs.readJson(file);
        expect(data.accessToken).toBeUndefined();
        expect(data.refreshToken).toBeUndefined();
    });
});
