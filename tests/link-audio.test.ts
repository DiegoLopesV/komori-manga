import { it, expect } from 'vitest';
import {
  createProject,
  newElement,
  linkElement,
  visibleIds,
  musicAt,
  removeAsset,
  momentAudioIds,
  buildPublication,
  makeTemplate,
} from '../src/core';
it('linking panels merges reveal timing and shares the target music, including descendants', () => {
  const p = createProject().chapters[0].pages[0];
  const [a, b] = p.elements;
  const child = { ...newElement('bubble'), parentId: b.id, voiceId: 'voice' };
  p.elements.push(child);
  p.moments[0].musicId = 'target';
  p.moments[1].musicId = 'old';
  p.moments[1].show.push(child.id);
  const linked = linkElement(p, b.id, a.id);
  expect(linked.elements.find((e) => e.id === b.id)?.parentId).toBe(a.id);
  expect(visibleIds(linked.moments, 0, linked.elements)).toEqual(new Set([a.id, b.id, child.id]));
  expect(musicAt(linked.moments, 0)).toBe('target');
  expect(linked.moments.some((m) => m.musicId === 'old')).toBe(false);
  expect(p.elements[1].parentId).toBeUndefined();
  expect(momentAudioIds(linked, 0, 'voice')).toEqual(['voice']);
  const unlinked = linkElement(linked, b.id);
  expect(unlinked.elements.find((e) => e.id === b.id)?.parentId).toBeUndefined();
  expect(visibleIds(unlinked.moments, 0, unlinked.elements).has(b.id)).toBe(false);
  expect(musicAt(unlinked.moments, 1)).toBe('target');
});
it('cycle links are rejected and unrelated moments survive', () => {
  const p = createProject().chapters[0].pages[0];
  const [a, b] = p.elements;
  const linked = linkElement(p, b.id, a.id);
  expect(linkElement(linked, a.id, b.id)).toEqual(linked);
  expect(linked.moments.some((m) => m.show.includes(p.elements[2].id))).toBe(true);
});
it('element audio is published, stripped from presets and removed from drafts without changing a publication', () => {
  const p = createProject();
  const page = p.chapters[0].pages[0];
  const b = { ...newElement('bubble'), voiceId: 'voice' };
  page.elements.push(b);
  page.moments[0].show.push(b.id);
  p.assets.push({
    id: 'voice',
    name: 'voice.wav',
    type: 'audio',
    mime: 'audio/wav',
    size: 1,
    src: 'test',
  });
  const published = buildPublication(p, p.chapters[0].id);
  expect(published.assets.some((a) => a.id === 'voice')).toBe(true);
  expect(makeTemplate(b, 'bubble').element.voiceId).toBeUndefined();
  const cleaned = removeAsset(p, 'voice');
  expect(cleaned.assets.some((a) => a.id === 'voice')).toBe(false);
  expect(cleaned.chapters[0].pages[0].elements.find((e) => e.id === b.id)?.voiceId).toBeUndefined();
  expect(published.assets).toHaveLength(1);
});
