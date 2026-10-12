export type Point = { x: number; y: number; curve?: number };
export type Transition = 'none' | 'fade' | 'slide' | 'zoom' | 'shake';
export type Asset = {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  mime: string;
  size: number;
  src: string;
  path?: string;
};
export type Element = {
  id: string;
  name: string;
  kind: 'panel' | 'image' | 'bubble' | 'text' | 'sfx' | 'video';
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
};
export type Page = {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: Element[];
  moments: Moment[];
  backgroundAssetId?: string;
};
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
export function visibleIds(moments: Moment[], index: number): Set<string> {
  const visible = new Set<string>();
  moments.slice(0, index + 1).forEach((moment) => {
    moment.show.forEach((id) => visible.add(id));
    moment.hide.forEach((id) => visible.delete(id));
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
  copy.elements.forEach((e) => {
    if (e.kind === 'panel') {
      e.assetId = assetId;
      e.pageImage = true;
    }
  });
  return copy;
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
