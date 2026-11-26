import axios from 'axios';

/**
 * After the #319 security patch, the storefront rejects unapproved dev/ files
 * (x-crafter-theme-version: dev) with a 403 unless a signed preview token is present.
 * The token endpoint comes with CLI 2.0; in this version live preview stays disabled,
 * while file watching and sync keep working.
 */

export const DEV_THEME_VERSION_HEADER = 'x-crafter-theme-version';

export const PREVIEW_UNAVAILABLE_LINES = [
    'Live preview is temporarily unavailable after a security update.',
    'Your files are still being synced. A CLI update will bring preview back.',
];

export function publishedPreviewUrl(storefrontUrl: string, themeId: string): string {
    const url = new URL('/', storefrontUrl);
    url.searchParams.set('themeId', themeId);
    return url.toString();
}

export function publishedPreviewLines(url: string): string[] {
    return [
        `Your theme is published. You can preview the published version (local changes are not shown): ${url}`,
    ];
}

/** Whether the storefront response shows the dev source was rejected without a token */
export function isDevPreviewForbidden(status: number | undefined): boolean {
    return status === 403;
}

export type PreviewProbeResult = 'available' | 'forbidden' | 'unknown';

/** Sends a preview request to the storefront with the dev source; classifies the response, never throws */
export async function probeDevPreview(storefrontUrl: string, themeId: string): Promise<PreviewProbeResult> {
    try {
        const res = await axios.get(publishedPreviewUrl(storefrontUrl, themeId), {
            headers: { [DEV_THEME_VERSION_HEADER]: 'dev', 'x-crafter-theme-id': themeId },
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: () => true,
            responseType: 'text',
        });
        if (isDevPreviewForbidden(res.status)) return 'forbidden';
        if (res.status >= 200 && res.status < 400) return 'available';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

/** Whether the theme is published on the server (for the owner, GET /marketplace/themes/:id returns the full record) */
export async function isThemePublished(api: any, themeId: string): Promise<boolean> {
    try {
        const res = await api.get(`/marketplace/themes/${themeId}`);
        const theme = res?.data?.data ?? res?.data;
        return theme?.status === 'published';
    } catch {
        return false;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Page shown in the browser when the local proxy gets a 403 */
export function previewUnavailableHtml(publishedUrl?: string): string {
    const lines = [...PREVIEW_UNAVAILABLE_LINES, ...(publishedUrl ? publishedPreviewLines(publishedUrl) : [])];
    const body = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('\n');
    const link = publishedUrl ? `<p><a href="${escapeHtml(publishedUrl)}">${escapeHtml(publishedUrl)}</a></p>` : '';
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Crafter</title></head>` +
        `<body style="font-family:sans-serif;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">` +
        `<h1>Crafter</h1>${body}${link}</body></html>`;
}
