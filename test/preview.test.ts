import { describe, expect, it } from 'vitest';
import { isDevPreviewForbidden, previewUnavailableHtml, publishedPreviewUrl, PREVIEW_UNAVAILABLE_LINES } from '../src/utils/preview';

describe('preview helpers', () => {
    it('detects a 403 as a dev preview rejection', () => {
        expect(isDevPreviewForbidden(403)).toBe(true);
        expect(isDevPreviewForbidden(200)).toBe(false);
        expect(isDevPreviewForbidden(undefined)).toBe(false);
    });

    it('builds the published preview link', () => {
        expect(publishedPreviewUrl('https://origin.crafter.web.tr', 'abc')).toBe('https://origin.crafter.web.tr/?themeId=abc');
    });

    it('message is in English and does not say CrafterCMS', () => {
        const html = previewUnavailableHtml('https://origin.crafter.web.tr/?themeId=abc');
        expect(PREVIEW_UNAVAILABLE_LINES.join(' ')).toMatch(/security update/);
        expect(html).toContain('themeId=abc');
        expect(html).not.toMatch(/CrafterCMS/);
    });
});
