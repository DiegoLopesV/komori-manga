import { expect, it } from 'vitest';
import { createProject, newPage, buildPublication } from '../src/core';
it('publishes only the selected chapter and keeps other published chapters unchanged', () => {
  const project = createProject();
  const original = structuredClone(project);
  const second = { id: 'second', title: 'Two', pages: [newPage()] };
  project.chapters.push(second);
  project.chapters[0].title = 'Draft changed';
  const published = buildPublication(project, 'second', original);
  expect(published.chapters.map((c) => c.title)).toEqual([original.chapters[0].title, 'Two']);
  expect(buildPublication(project, 'second').chapters).toHaveLength(1);
});
it('only includes assets referenced by published chapters or cover', () => {
  const project = createProject();
  project.assets = [
    { id: 'used', name: 'used', type: 'image', mime: 'image/png', size: 1, src: 'ok' },
    { id: 'private', name: 'private', type: 'image', mime: 'image/png', size: 1, src: 'private' },
  ];
  project.chapters[0].pages[0].elements[0].assetId = 'used';
  expect(buildPublication(project, project.chapters[0].id).assets.map((a) => a.id)).toEqual([
    'used',
  ]);
});
