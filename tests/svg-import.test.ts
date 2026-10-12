import { describe, it, expect } from 'vitest';
import { importSvg } from '../src/svgImport';
const layout = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 708 1000" width="182mm" height="257mm"><rect width="708" height="1000" fill="#fff"/><polygon points="228.8,56 50,56 50,473.8 252.5,457.6" fill="#fff" stroke="#101417" stroke-width="4"/><polygon points="405.5,56 237.9,56 261.5,456.9 408.4,445.1" fill="#fff" stroke="#101417" stroke-width="4"/><polygon points="658,56 414.5,56 417.4,444.4 658,425.1" fill="#fff" stroke="#101417" stroke-width="4"/><polygon points="658,441.2 50,489.8 50,944 658,944" fill="#fff" stroke="#101417" stroke-width="4"/></svg>`;
describe('editable SVG import', () => {
  it('imports generator-style layouts as four editable polygon panels at original page dimensions', () => {
    const { page, warnings } = importSvg(layout);
    expect(page.width).toBe(708);
    expect(page.height).toBe(1000);
    expect(page.elements).toHaveLength(4);
    expect(warnings).toHaveLength(0);
    expect(page.elements.every((e) => e.kind === 'panel' && e.points.length === 4)).toBe(true);
    expect(page.elements[0].x).toBe(50);
    expect(page.elements[0].width).toBeCloseTo(202.5);
    expect(page.moments).toHaveLength(4);
  });
  it('preserves nested groups, transformations, curves and editable text', () => {
    const { page } = importSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g id="scene" transform="translate(30 40)"><path d="M0 0 C0 20 20 20 20 0Z" fill="white" stroke="black"/><text x="0" y="50">Hello</text></g></svg>`,
    );
    const group = page.elements.find((e) => e.kind === 'group')!;
    const curve = page.elements.find((e) => e.pathD)!;
    expect(curve.x).toBe(30);
    expect(curve.parentId).toBe(group.id);
    expect(curve.pathD).toContain('C');
    expect(page.elements.find((e) => e.kind === 'text')?.text).toBe('Hello');
  });
  it('never imports scripts, event handlers, foreign HTML or external resources', () => {
    const result = importSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><image href="https://example.com/private.png" width="100" height="100"/><rect width="40" height="40" onclick="alert(1)" fill="white" stroke="black"/></svg>`,
    );
    expect(result.page.elements).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.page)).not.toMatch(/onclick|alert\(1\)|example.com/);
  });
  it('rejects malformed XML and entity declarations', () => {
    expect(() => importSvg('<svg><bad></svg>')).toThrow();
    expect(() => importSvg('<!DOCTYPE svg><svg/>')).toThrow();
  });
});
