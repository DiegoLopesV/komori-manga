import { it, expect } from 'vitest';
import {
  createProject,
  newElement,
  changeElement,
  removeElement,
  deletePage,
  elementPreset,
  makeTemplate,
  instantiateTemplate,
  mapPageArtwork,
  visibleIds,
  normalizeProject,
  duplicateElement,
} from '../src/core';
it('upgrades old PNG drafts without replacing separately assigned artwork', () => {
  const p = createProject(),
    page = p.chapters[0].pages[0];
  page.backgroundAssetId = 'old';
  page.elements[0].pageImage = true;
  page.elements[0].assetId = 'old';
  page.elements[1].assetId = 'custom';
  const updated = normalizeProject(p).chapters[0].pages[0];
  expect(updated.backgroundElementId).toBeTruthy();
  expect(updated.elements.find((e) => e.id === page.elements[1].id)?.assetId).toBe('custom');
});
it('duplicating a panel duplicates its linked content with fresh parent references', () => {
  const page = createProject().chapters[0].pages[0],
    root = page.elements[0],
    child = newElement('bubble');
  child.parentId = root.id;
  page.elements.push(child);
  page.moments[0].show.push(child.id);
  const result = duplicateElement(page, root.id);
  const copy = result.page.elements.find((e) => e.parentId === result.id)!;
  expect(copy.id).not.toBe(child.id);
  expect(result.page.moments[0].show).toContain(copy.id);
});
it('group children scheduled for later do not reveal prematurely', () => {
  const group = newElement('group'),
    child = newElement('text');
  child.parentId = group.id;
  const moments = [
    { id: 'a', label: 'A', show: [group.id], hide: [], transition: 'none' as const, duration: 0 },
    { id: 'b', label: 'B', show: [child.id], hide: [], transition: 'none' as const, duration: 0 },
  ];
  expect(visibleIds(moments, 0, [group, child]).has(child.id)).toBe(false);
  expect(visibleIds(moments, 1, [group, child]).has(child.id)).toBe(true);
});
it('moving or resizing a panel carries attached bubbles and text', () => {
  const p = createProject().chapters[0].pages[0],
    parent = p.elements[0],
    child = newElement('bubble', parent.x + 20, parent.y + 30);
  child.parentId = parent.id;
  p.elements.push(child);
  const changed = changeElement(p, { ...parent, x: parent.x + 50, width: parent.width * 2 });
  expect(changed.elements.at(-1)?.x).toBe(parent.x + 50 + 40);
  expect(changed.elements.at(-1)?.width).toBe(child.width * 2);
  expect(removeElement(changed, parent.id).elements.some((e) => e.id === child.id)).toBe(false);
});
it('deleting pages never leaves a chapter without a page and supports immutable undo', () => {
  const p = createProject();
  const result = deletePage(p, 0, 0);
  expect(result.chapters[0].pages).toHaveLength(1);
  expect(result.chapters[0].pages[0].elements).toHaveLength(0);
  expect(p.chapters[0].pages[0].elements).toHaveLength(4);
});
it('a finished PNG has a selectable background element; deletion removes crop references', () => {
  const p = mapPageArtwork(createProject().chapters[0].pages[0], 'png');
  const image = p.elements.find((e) => e.id === p.backgroundElementId)!;
  expect(image.kind).toBe('image');
  const removed = removeElement(p, image.id);
  expect(removed.backgroundAssetId).toBeUndefined();
  expect(removed.elements.every((e) => e.assetId !== 'png')).toBe(true);
});
it('personal presets keep shape/style but not artwork, parent links or identity', () => {
  const panel = elementPreset('panel', 'diagonal');
  panel.assetId = 'private';
  panel.parentId = 'parent';
  const template = makeTemplate(panel, 'Meu quadro');
  const first = instantiateTemplate(template),
    second = instantiateTemplate(template);
  expect(first.points).toEqual(panel.points);
  expect(first.assetId).toBeUndefined();
  expect(first.parentId).toBeUndefined();
  expect(first.id).not.toBe(second.id);
  expect(elementPreset('bubble', 'thought').pathD).toBeTruthy();
  expect(elementPreset('text', 'caption').fontSize).toBeGreaterThan(0);
});
