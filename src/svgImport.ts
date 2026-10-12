import svgpath from 'svgpath';
import { svgPathBbox } from 'svg-path-bbox';
import { newElement, newPage, uid, type Page, type Element, type Asset } from './core';

// XML is parsed into a typed model. Raw XML/HTML is never inserted into the document.
export function importSvg(source: string): { page: Page; assets: Asset[]; warnings: string[] } {
  if (source.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error(
      'SVG muito grande ou com declarações não permitidas / Unsupported SVG declarations',
    );
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.querySelector('parsererror'))
    throw new Error('SVG inválido / Invalid SVG');
  if (root.querySelectorAll('*').length > 2000)
    throw new Error('SVG com mais de 2000 objetos / SVG exceeds 2000 objects');
  const nums = (value: string) =>
    value.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const view = nums(root.getAttribute('viewBox') ?? '');
  const box =
    view.length === 4
      ? view
      : [0, 0, Number(root.getAttribute('width')), Number(root.getAttribute('height'))];
  if (!box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0 || box[2] > 20000 || box[3] > 20000)
    throw new Error('Defina um viewBox válido no SVG / SVG needs a valid viewBox');
  const page = newPage();
  page.width = box[2];
  page.height = box[3];
  page.elements = [];
  page.moments = [];
  const assets: Asset[] = [],
    warnings = new Set<string>();
  const unsupported = (name: string) => warnings.add(`Não importado / Not imported: ${name}`);
  const paint = (value: string | undefined, fallback: string) => {
    const v = value?.trim() ?? fallback;
    if (/url\(|var\(|javascript:|expression\(/i.test(v)) {
      unsupported('paint reference');
      return fallback;
    }
    if (v === 'white') return '#ffffff';
    if (v === 'black') return '#000000';
    if (/^#[\da-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((x) => x + x).join('');
    return /^(#[\da-f]{6,8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d.,%\s+-]+\))$/i.test(v) ? v : fallback;
  };
  const styles = [
    'fill',
    'stroke',
    'stroke-width',
    'font-size',
    'font-family',
    'opacity',
    'display',
    'visibility',
    'text-anchor',
  ];
  function declarations(value: string) {
    const result: Record<string, string> = {};
    value.split(';').forEach((part) => {
      const split = part.indexOf(':');
      if (split < 0) return;
      const key = part.slice(0, split).trim(),
        val = part.slice(split + 1).trim();
      if (styles.includes(key)) result[key] = val;
    });
    return result;
  }
  const css: Array<{ selector: string; style: Record<string, string> }> = [];
  root.querySelectorAll('style').forEach((style) => {
    const text = style.textContent ?? '';
    if (/@import|url\(/i.test(text)) unsupported('external CSS');
    for (const match of text.matchAll(/([^{}]+)\{([^{}]+)\}/g))
      for (const selector of match[1].split(',')) {
        if (/^[.#]?[\w-]+$/.test(selector.trim()))
          css.push({ selector: selector.trim(), style: declarations(match[2]) });
        else unsupported('complex CSS selector');
      }
  });
  function styleOf(node: globalThis.Element, parent: Record<string, string>) {
    const style = { ...parent };
    for (const key of styles) {
      const value = node.getAttribute(key);
      if (value !== null && value !== 'inherit') style[key] = value;
    }
    for (const rule of css) {
      if (node.matches(rule.selector)) Object.assign(style, rule.style);
    }
    Object.assign(style, declarations(node.getAttribute('style') ?? ''));
    return style;
  }
  function transformPath(d: string, transforms: string[]) {
    let p = svgpath(d);
    for (const transform of [...transforms].reverse()) p = p.transform(transform);
    return p.translate(-box[0], -box[1]).abs();
  }
  function point(x: number, y: number, transforms: string[]) {
    let result = { x, y };
    transformPath(`M${x} ${y}`, transforms).iterate((segment) => {
      if (segment[0] === 'M') result = { x: segment[1], y: segment[2] };
    });
    return result;
  }
  function visit(
    node: globalThis.Element,
    parentStyle: Record<string, string>,
    transforms: string[],
    parentId?: string,
    depth = 0,
  ) {
    if (depth > 40) {
      unsupported('deep group/reference');
      return;
    }
    const tag = node.localName,
      style = styleOf(node, parentStyle);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    if ([...node.attributes].some((a) => /^on/i.test(a.name))) unsupported('event handlers');
    for (const property of ['filter', 'mask', 'clip-path'])
      if (node.hasAttribute(property)) unsupported(property);
    const chain = node.getAttribute('transform')
      ? [...transforms, node.getAttribute('transform')!]
      : transforms;
    const number = (attr: string, fallback = 0) => {
      const raw = node.getAttribute(attr);
      const n = raw === null ? fallback : Number.parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    };
    if (['title', 'desc', 'metadata', 'style', 'defs'].includes(tag)) return;
    if (
      tag === 'script' ||
      tag === 'foreignObject' ||
      tag === 'a' ||
      tag.startsWith('animate') ||
      tag === 'set'
    ) {
      unsupported(tag);
      return;
    }
    if (tag === 'svg' || tag === 'g') {
      let group: Element | undefined;
      if (tag === 'g') {
        group = {
          ...newElement('group'),
          name: node.getAttribute('id') ?? 'Grupo SVG',
          parentId,
          fill: 'none',
          stroke: 'none',
          strokeWidth: 0,
        };
        page.elements.push(group);
      }
      const before = page.elements.length;
      for (const child of Array.from(node.children))
        visit(child, style, chain, group?.id ?? parentId, depth + 1);
      if (group) {
        const children = page.elements.slice(before);
        if (!children.length) {
          page.elements = page.elements.filter((e) => e.id !== group!.id);
          return;
        }
        group.x = Math.min(...children.map((e) => e.x));
        group.y = Math.min(...children.map((e) => e.y));
        group.width = Math.max(...children.map((e) => e.x + e.width)) - group.x;
        group.height = Math.max(...children.map((e) => e.y + e.height)) - group.y;
      }
      return;
    }
    if (tag === 'use') {
      const href = node.getAttribute('href') ?? node.getAttribute('xlink:href') ?? '';
      const target = href.startsWith('#') ? doc.getElementById(href.slice(1)) : null;
      if (!target) {
        unsupported('external or missing use');
        return;
      }
      visit(
        target,
        style,
        [...chain, `translate(${number('x')} ${number('y')})`],
        parentId,
        depth + 1,
      );
      return;
    }
    if (tag === 'text') {
      const text = node.textContent ?? '',
        font = Math.max(8, Number.parseFloat(style['font-size'] ?? '24') || 24),
        position = point(number('x'), number('y') - font, chain);
      const e = {
        ...newElement('text', position.x, position.y),
        name: node.getAttribute('id') ?? 'Texto SVG',
        parentId,
        text,
        fontSize: font,
        width: Math.max(font, text.length * font * 0.65),
        height: font * 1.7,
        textColor: paint(style.fill, '#000000'),
        fontFamily: /^[\w\s,'-]+$/.test(style['font-family'] ?? '')
          ? style['font-family']
          : undefined,
      };
      if (style['text-anchor'] === 'middle') e.x -= e.width / 2;
      if (style['text-anchor'] === 'end') e.x -= e.width;
      if (chain.some((t) => /rotate|skew/.test(t))) unsupported('rotated/skewed text');
      page.elements.push(e);
      return;
    }
    let d = '',
      vertices: Array<{ x: number; y: number }> | undefined;
    if (tag === 'rect') {
      const x = number('x'),
        y = number('y'),
        w = number('width'),
        h = number('height'),
        rx = Math.min(number('rx'), w / 2),
        ry = Math.min(number('ry', rx), h / 2);
      if (
        x === box[0] &&
        y === box[1] &&
        w === box[2] &&
        h === box[3] &&
        (!style.stroke || style.stroke === 'none') &&
        !chain.length
      ) {
        page.backgroundFill = paint(style.fill, '#ffffff');
        return;
      }
      if (rx || ry)
        d = `M${x + rx} ${y}H${x + w - rx}Q${x + w} ${y} ${x + w} ${y + ry}V${y + h - ry}Q${x + w} ${y + h} ${x + w - rx} ${y + h}H${x + rx}Q${x} ${y + h} ${x} ${y + h - ry}V${y + ry}Q${x} ${y} ${x + rx} ${y}Z`;
      else
        vertices = [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ];
    } else if (tag === 'polygon' || tag === 'polyline') {
      const values = nums(node.getAttribute('points') ?? '');
      if (values.length < 4 || values.length % 2) {
        unsupported('invalid points');
        return;
      }
      vertices = values.filter((_, i) => i % 2 === 0).map((x, i) => ({ x, y: values[i * 2 + 1] }));
      if (tag === 'polyline') d = vertices.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
    } else if (tag === 'path') d = node.getAttribute('d') ?? '';
    else if (tag === 'circle' || tag === 'ellipse') {
      const cx = number('cx'),
        cy = number('cy'),
        rx = number(tag === 'circle' ? 'r' : 'rx'),
        ry = number(tag === 'circle' ? 'r' : 'ry');
      d = `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    } else if (tag === 'line')
      d = `M${number('x1')} ${number('y1')}L${number('x2')} ${number('y2')}`;
    else if (tag === 'image') {
      const href = node.getAttribute('href') ?? node.getAttribute('xlink:href') ?? '';
      if (!/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=\s]+$/i.test(href)) {
        unsupported('external or unsupported image');
        return;
      }
      const p = point(number('x'), number('y'), chain),
        end = point(number('x') + number('width'), number('y') + number('height'), chain);
      const asset: Asset = {
        id: uid(),
        name: 'Imagem SVG',
        type: 'image',
        mime: href.slice(5, href.indexOf(';')),
        size: Math.ceil(href.slice(href.indexOf(',') + 1).length * 0.75),
        src: href,
      };
      assets.push(asset);
      page.elements.push({
        ...newElement('image', p.x, p.y),
        name: node.getAttribute('id') ?? 'Imagem SVG',
        parentId,
        width: Math.max(1, Math.abs(end.x - p.x)),
        height: Math.max(1, Math.abs(end.y - p.y)),
        assetId: asset.id,
        strokeWidth: 0,
      });
      return;
    } else {
      unsupported(tag);
      return;
    }
    try {
      const worldVertices = vertices?.map((p) => point(p.x, p.y, chain));
      const path =
        worldVertices && tag !== 'polyline'
          ? worldVertices.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + 'Z'
          : transformPath(d, chain).toString();
      const [minX, minY, maxX, maxY] = svgPathBbox(path),
        width = Math.max(1, maxX - minX),
        height = Math.max(1, maxY - minY);
      if (![minX, minY, width, height].every(Number.isFinite) || path.length > 100000)
        throw new Error('Invalid path');
      const fill = paint(style.fill, '#000000'),
        stroke = paint(style.stroke, 'none');
      const kind =
        fill === '#ffffff' && stroke !== 'none' && /[zZ]\s*$/.test(path) ? 'panel' : 'vector';
      const e = {
        ...newElement(kind, minX, minY),
        name:
          node.getAttribute('id') ??
          `${kind === 'panel' ? 'Quadro' : 'Vetor'} ${page.elements.length + 1}`,
        parentId,
        width,
        height,
        fill,
        stroke,
        strokeWidth: Math.max(0, Number.parseFloat(style['stroke-width'] ?? '1') || 0),
      };
      if (worldVertices && tag !== 'polyline')
        e.points = worldVertices.map((p) => ({
          x: (p.x - minX) / width,
          y: (p.y - minY) / height,
        }));
      else
        e.pathD = svgpath(path)
          .translate(-minX, -minY)
          .scale(1 / width, 1 / height)
          .round(6)
          .toString();
      page.elements.push(e);
    } catch {
      unsupported(`invalid ${tag}`);
    }
  }
  visit(root, {}, []);
  if (!page.elements.length)
    throw new Error('SVG sem elementos compatíveis / No supported SVG objects');
  for (const e of page.elements.filter((e) => !e.parentId))
    page.moments.push({
      id: uid(),
      label: e.name,
      show: [e.id],
      hide: [],
      transition: 'fade',
      duration: 400,
      anchorId: e.id,
    });
  return { page, assets, warnings: [...warnings] };
}
