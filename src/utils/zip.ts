import * as path from 'path';

/**
 * ZIP archive builder fully compatible with different archiver versions (v7 function vs v8 ZipArchive class)
 * and with CommonJS/ESM environments.
 */
export function createZipArchive(options: any = { zlib: { level: 6 } }): any {
    const archiverModule = require('archiver');
    
    if (archiverModule.ZipArchive) {
        return new archiverModule.ZipArchive(options);
    }
    if (typeof archiverModule === 'function') {
        return archiverModule('zip', options);
    }
    if (archiverModule.default) {
        if (archiverModule.default.ZipArchive) {
            return new archiverModule.default.ZipArchive(options);
        }
        if (typeof archiverModule.default === 'function') {
            return archiverModule.default('zip', options);
        }
    }
    throw new Error('Could not initialize the ZIP archiver module.');
}

/** Adds the given theme files (relative keys) to the archive */
export function addThemeFiles(archive: any, projectDir: string, files: string[]): void {
    for (const key of files) {
        archive.file(path.join(projectDir, ...key.split('/')), { name: key });
    }
}

/** ZIPs the given theme files in memory */
export function createThemeZipBuffer(projectDir: string, files: string[], level = 6): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const bufs: Buffer[] = [];
        const archive = createZipArchive({ zlib: { level } });

        archive.on('data', (chunk: Buffer) => bufs.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(bufs)));
        archive.on('error', (err: any) => reject(err));

        addThemeFiles(archive, projectDir, files);
        archive.finalize();
    });
}
