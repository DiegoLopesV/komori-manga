export type Point = { x: number; y: number; curve?: number };
export type Transition = 'none' | 'fade' | 'slide' | 'zoom' | 'shake';
export type Asset = {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  audioRole?: 'voice' | 'sfx' | 'music';
  mime: string;
  size: number;
  src: string;
  path?: string;
};
export type Element = {
  id: string;
  name: string;
  kind: 'panel' | 'image' | 'bubble' | 'text' | 'sfx' | 'video' | 'vector' | 'group';
  parentId?: string;
  voiceId?: string;
  sfxId?: string;
  pathD?: string;
  textColor?: string;
  fontFamily?: string;
  editorOnly?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  points: Point[];
  assetId?: string;
  posterId?: string;
  text?: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  imageScale: number;
  imageX: number;
  imageY: number;
  loop: boolean;
  pageImage?: boolean;
};
export type Moment = {
  id: string;
  label: string;
  show: string[];
  hide: string[];
  transition: Transition;
  duration: number;
  voiceId?: string;
  sfxId?: string;
  musicId?: string;
  stopMusic?: boolean;
  anchorId?: string;
};
export type Page = {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: Element[];
  moments: Moment[];
  backgroundAssetId?: string;
  backgroundElementId?: string;
  backgroundFill?: string;
};
export type ElementTemplate = { id: string; name: string; element: Element };
export type Chapter = { id: string; title: string; pages: Page[] };
export type Project = {
  version: 1;
  id: string;
  title: string;
  description: string;
  author: string;
  language: 'pt-BR' | 'en';
  direction: 'rtl' | 'ltr';
  adult: boolean;
  coverId?: string;
  support: { label: string; url: string }[];
  assets: Asset[];
  chapters: Chapter[];
};
export type Playback = { index: number; transitioning: boolean; playAudio: boolean };
export const uid = () => crypto.randomUUID();
export const rectangle: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];
export function newElement(kind: Element['kind'], x = 55, y = 65): Element {
  return {
    id: uid(),
    kind,
    name: kind,
    x,
    y,
    width: kind === 'panel' ? 330 : 240,
    height: kind === 'panel' ? 250 : 100,
    points: structuredClone(rectangle),
    text:
      kind === 'bubble'
        ? 'Sua história começa aqui.'
        : kind === 'sfx'
          ? 'BOOM!'
          : kind === 'text'
            ? 'Texto'
            : '',
    fontSize: kind === 'sfx' ? 42 : 24,
    fill: kind === 'panel' ? '#ece9e2' : '#ffffff',
    stroke: '#222521',
    strokeWidth: 3,
    imageScale: 1,
    imageX: 0,
    imageY: 0,
    loop: false,
  };
}
export function newPage(): Page {
  return {
    id: uid(),
    name: 'Página',
    width: 800,
    height: 1120,
    elements: [],
    moments: [
      { id: uid(), label: 'Abertura', show: [], hide: [], transition: 'fade', duration: 400 },
    ],
  };
}
export function createProject(): Project {
  const page = applyTemplate(newPage(), 'classic');
  page.elements[0].text = '';
  return {
    version: 1,
    id: uid(),
    title: 'Sem título',
    description: '',
    author: '',
    language: 'pt-BR',
    direction: 'rtl',
    adult: false,
    support: [],
    assets: [],
    chapters: [{ id: uid(), title: 'Capítulo 1', pages: [page] }],
  };
}
export function snapshot(project: Project): Project {
  return structuredClone(project);
}
export function buildPublication(draft: Project, chapterId: string, previous?: Project): Project {
  const result = snapshot(draft);
  const selected = draft.chapters.find((c) => c.id === chapterId);
  if (!selected) throw new Error('Capítulo inexistente / Chapter not found');
  result.chapters = draft.chapters.flatMap((c) =>
    c.id === chapterId
      ? [structuredClone(c)]
      : previous?.chapters.find((old) => old.id === c.id)
        ? [structuredClone(previous.chapters.find((old) => old.id === c.id)!)]
        : [],
  );
  const used = new Set<string>();
  if (result.coverId) used.add(result.coverId);
  result.chapters.forEach((c) =>
    c.pages.forEach((p) => {
      p.elements.forEach((e) => {
        if (e.assetId) used.add(e.assetId);
        if (e.posterId) used.add(e.posterId);
        if (e.voiceId) used.add(e.voiceId);
        if (e.sfxId) used.add(e.sfxId);
      });
      p.moments.forEach((m) => {
        if (m.voiceId) used.add(m.voiceId);
        if (m.sfxId) used.add(m.sfxId);
        if (m.musicId) used.add(m.musicId);
      });
    }),
  );
  const available = [...draft.assets, ...(previous?.assets ?? [])];
  result.assets = [...used].flatMap((id) => {
    const asset = available.find((a) => a.id === id);
    return asset ? [structuredClone(asset)] : [];
  });
  return result;
}
export const initialPlayback = (): Playback => ({
  index: 0,
  transitioning: true,
  playAudio: false,
});
export function advance(state: Playback, moments: Moment[]): Playback {
  if (state.transitioning) return { ...state, transitioning: false, playAudio: false };
  if (state.index >= moments.length - 1) return { ...state, playAudio: false };
  const index = state.index + 1;
  return {
    index,
    transitioning: moments[index].duration > 0 && moments[index].transition !== 'none',
    playAudio: true,
  };
}
export function back(state: Playback): Playback {
  return { index: Math.max(0, state.index - 1), transitioning: false, playAudio: false };
}
export function visibleIds(
  moments: Moment[],
  index: number,
  elements: Element[] = [],
): Set<string> {
  const visible = new Set<string>();
  const explicit = new Set(moments.flatMap((m) => m.show));
  moments.slice(0, index + 1).forEach((moment) => {
    moment.show.forEach((id) => {
      visible.add(id);
      if (elements.find((e) => e.id === id)?.kind === 'group')
        descendants(elements, id).forEach((child) => {
          if (!explicit.has(child)) visible.add(child);
        });
    });
    moment.hide.forEach((id) => {
      visible.delete(id);
      descendants(elements, id).forEach((child) => visible.delete(child));
    });
  });
  return visible;
}
export function geometryPath(points: Point[], width: number, height: number): string {
  if (points.length < 3) return '';
  const n = (v: number) => Math.round(v * 100) / 100;
  let path = `M ${n(points[0].x * width)} ${n(points[0].y * height)}`;
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length];
    const dx = (next.x - p.x) * width,
      dy = (next.y - p.y) * height;
    if (p.curve)
      path += ` C ${n(p.x * width + dx / 3 - dy * p.curve)} ${n(p.y * height + dy / 3 + dx * p.curve)} ${n(p.x * width + (dx * 2) / 3 - dy * p.curve)} ${n(p.y * height + (dy * 2) / 3 + dx * p.curve)} ${n(next.x * width)} ${n(next.y * height)}`;
    else path += ` L ${n(next.x * width)} ${n(next.y * height)}`;
  });
  return path + ' Z';
}
export function applyTemplate(page: Page, template: string): Page {
  const next = snapshotPage(page);
  const frames =
    template === 'splash'
      ? [[35, 35, 730, 1050]]
      : template === 'diagonal'
        ? [
            [35, 35, 730, 440],
            [35, 495, 355, 590],
            [410, 495, 355, 590],
          ]
        : [
            [35, 35, 730, 340],
            [35, 395, 355, 330],
            [410, 395, 355, 330],
            [35, 745, 730, 340],
          ];
  frames.forEach(([x, y, width, height], i) => {
    const frame = {
      ...newElement('panel', x, y),
      width,
      height,
      name: `Quadro ${next.elements.filter((e) => e.kind === 'panel').length + 1}`,
    };
    if (next.backgroundAssetId) {
      frame.assetId = next.backgroundAssetId;
      frame.pageImage = true;
    }
    if (template === 'diagonal' && i === 0)
      frame.points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.8 },
        { x: 0, y: 1 },
      ];
    next.elements.push(frame);
    if (i === 0 && next.moments[0]) next.moments[0].show.push(frame.id);
    else
      next.moments.push({
        id: uid(),
        label: frame.name,
        show: [frame.id],
        hide: [],
        transition: 'fade',
        duration: 400,
      });
  });
  return next;
}
function snapshotPage(page: Page): Page {
  return structuredClone(page);
}
export function mapPageArtwork(page: Page, assetId: string): Page {
  const copy = snapshotPage(page);
  copy.backgroundAssetId = assetId;
  copy.elements = copy.elements.filter((e) => e.id !== copy.backgroundElementId);
  const background = {
    ...newElement('image', 0, 0),
    name: 'Página importada',
    width: page.width,
    height: page.height,
    assetId,
    strokeWidth: 0,
    editorOnly: true,
  };
  copy.backgroundElementId = background.id;
  copy.elements.unshift(background);
  copy.elements.forEach((e) => {
    if (e.kind === 'panel') {
      e.assetId = assetId;
      e.pageImage = true;
    }
  });
  return copy;
}
export function descendants(elements: Element[], id: string): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const e of elements)
      if (e.parentId === parent && !result.has(e.id) && e.id !== id) {
        result.add(e.id);
        queue.push(e.id);
      }
  }
  return result;
}
export function changeElement(page: Page, updated: Element): Page {
  const result = snapshotPage(page),
    original = page.elements.find((e) => e.id === updated.id);
  if (!original) return result;
  const children = descendants(page.elements, updated.id),
    sx = updated.width / original.width,
    sy = updated.height / original.height;
  result.elements = result.elements.map((e) =>
    e.id === updated.id
      ? structuredClone(updated)
      : children.has(e.id)
        ? {
            ...e,
            x: updated.x + (e.x - original.x) * sx,
            y: updated.y + (e.y - original.y) * sy,
            width: e.width * sx,
            height: e.height * sy,
            fontSize: e.fontSize * Math.min(sx, sy),
          }
        : e,
  );
  return result;
}
export function removeElement(page: Page, id: string): Page {
  const result = snapshotPage(page),
    ids = descendants(page.elements, id);
  ids.add(id);
  result.elements = result.elements.filter((e) => !ids.has(e.id));
  result.moments = result.moments.filter((m) => {
    const affected = m.show.some((id) => ids.has(id));
    m.show = m.show.filter((e) => !ids.has(e));
    m.hide = m.hide.filter((e) => !ids.has(e));
    if (m.anchorId && ids.has(m.anchorId)) {
      delete m.anchorId;
      delete m.voiceId;
      delete m.sfxId;
      delete m.musicId;
    }
    return !affected || m.show.length > 0 || m.hide.length > 0;
  });
  if (!result.moments.length)
    result.moments.push({
      id: uid(),
      label: 'Abertura',
      show: [],
      hide: [],
      transition: 'fade',
      duration: 400,
    });
  if (ids.has(result.backgroundElementId ?? '')) {
    delete result.backgroundElementId;
    delete result.backgroundAssetId;
    result.elements.forEach((e) => {
      if (e.pageImage) {
        delete e.assetId;
        e.pageImage = false;
      }
    });
  }
  return result;
}
export function normalizeProject(project: Project): Project {
  const copy = snapshot(project);
  copy.chapters.forEach((c) =>
    c.pages.forEach((p) => {
      if (p.backgroundAssetId && !p.backgroundElementId) {
        const e = {
          ...newElement('image', 0, 0),
          name: 'Página importada',
          assetId: p.backgroundAssetId,
          width: p.width,
          height: p.height,
          strokeWidth: 0,
          editorOnly: true,
        };
        p.elements.unshift(e);
        p.backgroundElementId = e.id;
      }
    }),
  );
  return copy;
}
export function duplicateElement(page: Page, id: string): { page: Page; id: string } {
  const copy = snapshotPage(page),
    ids = descendants(page.elements, id);
  ids.add(id);
  const mappings = new Map([...ids].map((old) => [old, uid()]));
  page.elements
    .filter((e) => ids.has(e.id))
    .forEach((e) => {
      copy.elements.push({
        ...structuredClone(e),
        id: mappings.get(e.id)!,
        parentId: e.parentId ? (mappings.get(e.parentId) ?? e.parentId) : undefined,
        x: e.x + 20,
        y: e.y + 20,
      });
    });
  copy.moments.forEach((m) => {
    m.show.push(...m.show.filter((i) => ids.has(i)).map((i) => mappings.get(i)!));
    m.hide.push(...m.hide.filter((i) => ids.has(i)).map((i) => mappings.get(i)!));
  });
  return { page: copy, id: mappings.get(id)! };
}
export function deletePage(project: Project, chapterIndex: number, pageIndex: number): Project {
  const result = snapshot(project),
    chapter = result.chapters[chapterIndex];
  chapter.pages.splice(pageIndex, 1);
  if (!chapter.pages.length) chapter.pages.push(newPage());
  return result;
}
export function elementPreset(kind: Element['kind'], shape: string): Element {
  const e = newElement(kind);
  if (shape === 'diagonal')
    e.points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.85, y: 1 },
      { x: 0, y: 1 },
    ];
  if (shape === 'triangle')
    e.points = [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  if (shape === 'rounded')
    e.pathD = 'M.12 0H.88Q1 0 1 .12V.88Q1 1 .88 1H.12Q0 1 0 .88V.12Q0 0 .12 0Z';
  if (shape === 'circle' || shape === 'oval') e.pathD = 'M0 .5A.5 .5 0 1 0 1 .5A.5 .5 0 1 0 0 .5Z';
  if (shape === 'thought')
    e.pathD =
      'M.1 .2Q0 0 .3 .1Q.4 -.05 .6 .1Q1 0 .9 .4Q1 .7 .8 .8Q.7 1 .45 .85Q.2 1 .15 .75Q-.1 .6 .1 .2Z';
  if (shape === 'shout') {
    e.points = Array.from({ length: 24 }, (_, i) => {
      const a = (i * Math.PI) / 12 - Math.PI / 2,
        r = i % 2 ? 0.36 : 0.5;
      return { x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r };
    });
    e.pathD = undefined;
  }
  if (shape === 'caption') {
    e.pathD = 'M0 0H1V1H0Z';
    e.fill = '#f1ead9';
    e.strokeWidth = 1;
    e.textColor = '#222521';
    e.fontSize = 22;
  }
  if (shape === 'bold') {
    e.fontSize = 40;
    e.textColor = '#a44f35';
  }
  if (shape === 'whisper') {
    e.fontSize = 17;
    e.textColor = '#697767';
  }
  return e;
}
export function makeTemplate(element: Element, name: string): ElementTemplate {
  const copy = structuredClone(element);
  copy.id = uid();
  copy.x = 0;
  copy.y = 0;
  delete copy.assetId;
  delete copy.posterId;
  delete copy.voiceId;
  delete copy.sfxId;
  delete copy.parentId;
  delete copy.editorOnly;
  copy.pageImage = false;
  copy.imageX = 0;
  copy.imageY = 0;
  copy.imageScale = 1;
  return { id: uid(), name, element: copy };
}
export function instantiateTemplate(template: ElementTemplate): Element {
  return { ...structuredClone(template.element), id: uid(), name: template.name, x: 55, y: 65 };
}
export function safeLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
export const MAX_UPLOAD = 25 * 1024 * 1024;
export const mediaTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
];
export function validateUpload(file: { size: number; type: string }): string | null {
  if (!mediaTypes.includes(file.type)) return 'Formato não suportado / Unsupported format';
  if (file.size > MAX_UPLOAD) return 'Limite por arquivo: 25 MB / File limit: 25 MB';
  return null;
}
export function musicAt(moments: Moment[], index: number): string | undefined {
  let music: string | undefined;
  moments.slice(0, index + 1).forEach((m) => {
    if (m.stopMusic) music = undefined;
    else if (m.musicId) music = m.musicId;
  });
  return music;
}

export function linkElement(page: Page, id: string, parentId?: string): Page {
  const copy = snapshotPage(page),
    element = copy.elements.find((e) => e.id === id);
  if (!element || element.parentId === parentId) return copy;
  const subtree = descendants(copy.elements, id);
  subtree.add(id);
  const target = copy.elements.find((e) => e.id === parentId);
  if (parentId && (!target || subtree.has(parentId) || !['panel', 'group'].includes(target.kind)))
    return copy;
  const old = copy.moments.find((m) => m.show.includes(id));
  element.parentId = parentId;
  let root = target;
  const seen = new Set<string>();
  while (root?.parentId && !seen.has(root.id)) {
    seen.add(root.id);
    root = copy.elements.find((e) => e.id === root!.parentId) ?? root;
  }
  let destination = root ? copy.moments.find((m) => m.show.includes(root!.id)) : undefined;
  if (!destination) {
    destination = {
      id: uid(),
      label: root?.name ?? element.name,
      show: root ? [root.id] : [],
      hide: [],
      transition: old?.transition ?? 'fade',
      duration: old?.duration ?? 400,
      anchorId: root?.id ?? id,
      musicId: old?.musicId,
      stopMusic: old?.stopMusic,
    };
    const index = old ? copy.moments.indexOf(old) + 1 : copy.moments.length;
    copy.moments.splice(index, 0, destination);
  }
  if (!destination.musicId && !destination.stopMusic && old?.musicId)
    destination.musicId = old.musicId;
  const affected = new Set(
    copy.moments
      .filter((m) => m !== destination && m.show.some((e) => subtree.has(e)))
      .map((m) => m.id),
  );
  copy.moments.forEach((m) => {
    m.show = m.show.filter((e) => !subtree.has(e));
    m.hide = m.hide.filter((e) => !subtree.has(e));
    if (m !== destination && m.anchorId && subtree.has(m.anchorId)) {
      delete m.anchorId;
      if (!m.show.length && !m.hide.length) {
        delete m.musicId;
        delete m.stopMusic;
      }
    }
  });
  destination.show.push(...subtree);
  copy.moments = copy.moments.filter(
    (m) => m === destination || !affected.has(m.id) || m.show.length > 0 || m.hide.length > 0,
  );
  return copy;
}
export function momentAudioIds(page: Page, index: number, kind: 'voice' | 'sfx'): string[] {
  const moment = page.moments[index];
  if (!moment) return [];
  const before = visibleIds(page.moments, index - 1, page.elements),
    now = visibleIds(page.moments, index, page.elements);
  const ids = page.elements
    .filter((e) => now.has(e.id) && (!before.has(e.id) || moment.show.includes(e.id)))
    .flatMap((e) =>
      kind === 'voice' && e.kind === 'bubble' && e.voiceId
        ? [e.voiceId]
        : kind === 'sfx' && e.kind === 'sfx' && e.sfxId
          ? [e.sfxId]
          : [],
    );
  const legacy = kind === 'voice' ? moment.voiceId : moment.sfxId;
  if (legacy) ids.push(legacy);
  return [...new Set(ids)];
}
export function removeAsset(project: Project, id: string): Project {
  const copy = snapshot(project);
  copy.assets = copy.assets.filter((a) => a.id !== id);
  if (copy.coverId === id) delete copy.coverId;
  copy.chapters.forEach((c) =>
    c.pages.forEach((p) => {
      if (p.backgroundAssetId === id) delete p.backgroundAssetId;
      p.elements.forEach((e) => {
        for (const key of ['assetId', 'posterId', 'voiceId', 'sfxId'] as const)
          if (e[key] === id) delete e[key];
      });
      p.moments.forEach((m) => {
        for (const key of ['voiceId', 'sfxId', 'musicId'] as const)
          if (m[key] === id) delete m[key];
      });
    }),
  );
  return copy;
}
