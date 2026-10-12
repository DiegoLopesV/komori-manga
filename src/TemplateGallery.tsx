import { useState } from 'react';
import { Canvas } from './Canvas';
import {
  elementPreset,
  instantiateTemplate,
  newPage,
  type Element,
  type ElementTemplate,
} from './core';
import { tr, type Language } from './i18n';
const shapes = {
  panel: ['rectangle', 'diagonal', 'rounded', 'triangle', 'circle'],
  bubble: ['oval', 'rounded', 'thought', 'shout'],
  text: ['rectangle', 'caption', 'bold', 'whisper'],
  sfx: ['rectangle', 'bold', 'whisper'],
  vector: ['rectangle', 'rounded', 'circle'],
} as const;
export function TemplateGallery({
  language,
  kind,
  templates,
  onApply,
  onClose,
  onDelete,
}: {
  language: Language;
  kind: Element['kind'];
  templates: ElementTemplate[];
  onApply: (element: Element) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key),
    [type, setType] = useState(kind in shapes ? kind : 'panel');
  const options = shapes[type as keyof typeof shapes] ?? shapes.panel;
  function preview(element: Element) {
    const page = newPage();
    page.width = 180;
    page.height = 130;
    page.elements = [{ ...element, x: 15, y: 15, width: 150, height: 100, fontSize: 18 }];
    return <Canvas page={page} assets={[]} />;
  }
  return (
    <div className="modal-backdrop">
      <section className="modal preset-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t('modelLibrary')}</h2>
          <button aria-label={t('close')} onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          {t('modelKind')}
          <select value={type} onChange={(e) => setType(e.target.value as Element['kind'])}>
            {Object.keys(shapes).map((k) => (
              <option key={k} value={k}>
                {t(k as keyof typeof shapes)}
              </option>
            ))}
          </select>
        </label>
        <div className="section-label">{t('builtIn')}</div>
        <div className="preset-grid">
          {options.map((shape) => {
            const e = elementPreset(type, shape);
            return (
              <button
                key={shape}
                aria-label={t(shape === 'diagonal' ? 'shapeDiagonal' : shape)}
                onClick={() => onApply(e)}
              >
                {preview(e)}
                <span>{t(shape === 'diagonal' ? 'shapeDiagonal' : shape)}</span>
              </button>
            );
          })}
        </div>
        <div className="section-label">{t('myModels')}</div>
        <div className="preset-grid">
          {templates
            .filter((template) => template.element.kind === type)
            .map((template) => (
              <div className="personal-preset" key={template.id}>
                <button
                  aria-label={template.name}
                  onClick={() => onApply(instantiateTemplate(template))}
                >
                  {preview(template.element)}
                  <span>{template.name}</span>
                </button>
                <button
                  className="preset-remove"
                  aria-label={`${t('delete')} ${template.name}`}
                  onClick={() => onDelete(template.id)}
                >
                  ×
                </button>
              </div>
            ))}
        </div>
        {!templates.some((template) => template.element.kind === type) && <p>{t('noModels')}</p>}
      </section>
    </div>
  );
}
