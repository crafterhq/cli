import FormData from 'form-data';
import { collectThemeFiles, SkippedFile } from './ignore';
import { createThemeZipBuffer } from './zip';

export interface SyncResult {
    /** Number of files added to the ZIP */
    fileCount: number;
    /** Files not uploaded because of the shared rules */
    skipped: SkippedFile[];
    /** ZIP boyutu (byte) */
    zipBytes: number;
    /** Server response */
    data: any;
}

/**
 * ZIPs the theme folder with the shared ignore list and server allow list and sends it
 * to the POST /marketplace/themes/:id/sync endpoint in a single request.
 */
export async function syncThemeFiles(
    api: any,
    themeId: string,
    projectDir: string,
    onProgress?: (message: string) => void,
): Promise<SyncResult> {
    const { files, skipped } = await collectThemeFiles(projectDir);
    if (files.length === 0) {
        throw new Error('No theme files to upload.');
    }

    const zipBuffer = await createThemeZipBuffer(projectDir, files);
    onProgress?.(`Uploading the theme to the API (${files.length} files, ${Math.round(zipBuffer.length / 1024)} KB)...`);

    const form = new FormData();
    form.append('file', zipBuffer, {
        filename: 'theme.zip',
        contentType: 'application/zip',
    });

    const response = await api.post(`/marketplace/themes/${themeId}/sync`, form, {
        headers: form.getHeaders(),
    });

    return { fileCount: files.length, skipped, zipBytes: zipBuffer.length, data: response.data };
}
