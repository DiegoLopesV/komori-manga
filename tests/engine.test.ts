import { describe, expect, it } from 'vitest';
import {
  advance,
  back,
  initialPlayback,
  visibleIds,
  geometryPath,
  snapshot,
  safeLink,
  validateUpload,
  createProject,
  applyTemplate,
  mapPageArtwork,
} from '../src/core';

describe('reader pacing', () => {
  const moments = [
    { id: 'a', label: 'A', show: ['one'], hide: [], transition: 'fade' as const, duration: 300 },
    { id: 'b', label: 'B', show: ['two'], hide: ['one'], transition: 'none' as const, duration: 0 },
  ];
  it('finishes an active transition before advancing', () => {
    const first = initialPlayback();
    expect(advance(first, moments)).toMatchObject({
      index: 0,
      transitioning: false,
      playAudio: false,
    });
    expect(advance(advance(first, moments), moments)).toMatchObject({ index: 1, playAudio: true });
  });
  it('restores previous state without replaying audio, and clamps bounds', () => {
    expect(back({ index: 1, transitioning: false, playAudio: true })).toEqual({
      index: 0,
      transitioning: false,
      playAudio: false,
    });
    expect(back(initialPlayback()).index).toBe(0);
    expect(advance({ index: 1, transitioning: false, playAudio: false }, moments).index).toBe(1);
  });
  it('accumulates reveals, supports hide and recomputes earlier state', () => {
    expect([...visibleIds(moments, 0)]).toEqual(['one']);
    expect([...visibleIds(moments, 1)]).toEqual(['two']);
    expect([...visibleIds(moments, 0)]).toEqual(['one']);
  });
});
describe('authoring and publication', () => {
  it('maps a flattened page to panel crops without revealing the whole page', () => {
    const page = createProject().chapters[0].pages[0];
    const mapped = mapPageArtwork(page, 'page-art');
    expect(mapped.backgroundAssetId).toBe('page-art');
    expect(mapped.elements.filter(e=>e.kind==='panel').every((e) => e.assetId === 'page-art' && e.pageImage)).toBe(true);
    expect(mapped.elements.find(e=>e.id===mapped.backgroundElementId)?.editorOnly).toBe(true);
    expect(mapped.moments[0].show).toHaveLength(1);
    expect(applyTemplate(mapped, 'splash').elements.at(-1)?.pageImage).toBe(true);
  });
  it('keeps published snapshots independent from draft edits', () => {
    const project = createProject();
    const published = snapshot(project);
    project.title = 'Changed';
    project.chapters[0].pages[0].elements[0].text = 'Changed';
    expect(published.title).not.toBe('Changed');
    expect(published.chapters[0].pages[0].elements[0].text).not.toBe('Changed');
  });
  it('builds editable layouts without deleting artwork', () => {
    const page = createProject().chapters[0].pages[0];
    const updated = applyTemplate(page, 'diagonal');
    expect(updated.elements.length).toBeGreaterThanOrEqual(page.elements.length);
    expect(updated.elements.some((e) => e.kind === 'panel' && e.points.length >= 3)).toBe(true);
    expect(page).not.toBe(updated);
  });
  it('generates bounded cubic paths for editable curved frames', () => {
    const path = geometryPath(
      [
        { x: 0, y: 0, curve: 0.2 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      100,
      100,
    );
    expect(path).toContain('C');
    expect(path).toMatch(/^M/);
    expect(path).toMatch(/Z$/);
  });
  it('rejects executable links and accepts HTTPS donation links', () => {
    expect(safeLink('javascript:alert(1)')).toBe(false);
    expect(safeLink('https://ko-fi.com/artist')).toBe(true);
    expect(safeLink('http://example.com')).toBe(false);
  });
  it('limits upload size and allows only supported media types', () => {
    expect(validateUpload({ size: 100, type: 'image/png' })).toBeNull();
    expect(validateUpload({ size: 30 * 1024 * 1024, type: 'video/mp4' })).not.toBeNull();
    expect(validateUpload({ size: 100, type: 'image/svg+xml' })).not.toBeNull();
  });
});
