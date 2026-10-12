import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Upload,
  Play,
  Globe,
  Undo2,
  Redo2,
  Settings,
  Layers,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { Canvas } from './Canvas';
import { Reader } from './Reader';
import { useHistory } from './useHistory';
import {
  applyTemplate,
  newElement,
  newPage,
  snapshot,
  uid,
  safeLink,
  changeElement,
  removeElement,
  deletePage,
  descendants,
  elementPreset,
  makeTemplate,
  instantiateTemplate,
  duplicateElement,
  type ElementTemplate,
  type Project,
  type Element,
  type Asset,
} from './core';
import { cloud, publish, saveDraft, uploadMedia } from './cloud';
import { tr, type Language } from './i18n';
import { importSvg } from './svgImport';
import { loadElementTemplates, saveElementTemplate, removeElementTemplate } from './templates';
import { TemplateGallery } from './TemplateGallery';
export function Editor({
  initial,
  language,
  ownerId,
  onBack,
  onSave,
  onLogin,
}: {
  initial: Project;
  language: Language;
  ownerId?: string;
  onBack: () => void;
  onSave: (p: Project) => void;
  onLogin: () => void;
}) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const { project, commit, undo, redo, canUndo, canRedo } = useHistory(initial);
  const [chapterIndex, setChapterIndex] = useState(0),
    [pageIndex, setPageIndex] = useState(0),
    [selected, setSelected] = useState<string>();
  const [momentIndex, setMomentIndex] = useState(0),
    [tab, setTab] = useState<'pages' | 'materials' | 'layers'>('pages');
  const [preview, setPreview] = useState(false),
    [settings, setSettings] = useState(false),
    [templates, setTemplates] = useState(false);
  const [status, setStatus] = useState('local'),
    [error, setError] = useState(''),
    [share, setShare] = useState(''),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(''),
    [pageDeletion, setPageDeletion] = useState(false);
  const [gallery, setGallery] = useState<{ kind: Element['kind']; replace: boolean }>(),
    [personalTemplates, setPersonalTemplates] = useState<ElementTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false),
    [templateName, setTemplateName] = useState('');
  const artInput = useRef<HTMLInputElement>(null),
    voiceInput = useRef<HTMLInputElement>(null),
    sfxInput = useRef<HTMLInputElement>(null),
    musicInput = useRef<HTMLInputElement>(null),
    elementSvgInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    videoInput = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null),
    pageInput = useRef<HTMLInputElement>(null),
    revision = useRef(0);
  const chapter = project.chapters[chapterIndex],
    page = chapter.pages[pageIndex],
    element = page.elements.find((e) => e.id === selected),
    moment = page.moments[momentIndex] ?? page.moments[0];
  function update(fn: (copy: Project) => void) {
    const copy = snapshot(project);
    fn(copy);
    commit(copy);
  }
  function updatePage(fn: (copy: typeof page) => void) {
    update((p) => fn(p.chapters[chapterIndex].pages[pageIndex]));
  }
  function commitPage(next: typeof page) {
    update((p) => {
      p.chapters[chapterIndex].pages[pageIndex] = next;
    });
  }
  function updateElement(values: Partial<Element>) {
    if (element) commitPage(changeElement(page, { ...element, ...values }));
  }
  function selectElement(id: string) {
    setSelected(id);
    const e = page.elements.find((item) => item.id === id);
    const index = page.moments.findIndex((m) => m.show.includes(id) || m.anchorId === id);
    const parentIndex = e?.parentId
      ? page.moments.findIndex((m) => m.show.includes(e.parentId!))
      : -1;
    if (index >= 0) setMomentIndex(index);
    else if (parentIndex >= 0) setMomentIndex(parentIndex);
  }
  function removeSelected() {
    if (!element || busy || preview || settings || templates || share) return;
    const next = removeElement(page, element.id);
    commitPage(next);
    setMomentIndex((i) => Math.min(i, next.moments.length - 1));
    setSelected(undefined);
  }
  useEffect(() => {
    let cancelled = false;
    void loadElementTemplates(ownerId)
      .then((models) => {
        if (!cancelled) setPersonalTemplates(models);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [ownerId]);
  useEffect(() => {
    const token = ++revision.current;
    setStatus(ownerId ? 'saving' : 'local');
    const timer = setTimeout(() => {
      onSave(project);
      if (ownerId)
        void saveDraft(project, ownerId)
          .then(() => {
            if (token === revision.current) setStatus('saved');
          })
          .catch((e) => {
            if (token === revision.current) {
              setStatus('local');
              setError(e.message);
            }
          });
    }, 750);
    return () => clearTimeout(timer);
  }, [project, ownerId]); // parent callback is intentionally stable
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))
        return;
      if (
        busy ||
        preview ||
        settings ||
        templates ||
        share ||
        gallery ||
        pageDeletion ||
        savingTemplate
      )
        return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && element) {
        e.preventDefault();
        removeSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [
    undo,
    redo,
    element,
    project,
    busy,
    preview,
    settings,
    templates,
    share,
    gallery,
    pageDeletion,
    savingTemplate,
  ]);
  async function importFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError('');
    const copy = snapshot(project);
    try {
      for (const file of Array.from(files)) {
        const asset = await uploadMedia(file, copy, ownerId);
        copy.assets.push(asset);
      }
      commit(copy);
    } catch (e) {
      commit(copy);
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function importPage(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
        const result = importSvg(await file.text());
        result.page.name = file.name.replace(/\.svg$/i, '');
        for (const asset of result.assets) {
          if (ownerId) {
            const blob = await (await fetch(asset.src)).blob();
            Object.assign(
              asset,
              await uploadMedia(
                new File([blob], `${asset.id}.${asset.mime.split('/')[1]}`, { type: asset.mime }),
                project,
                ownerId,
              ),
              { id: asset.id },
            );
          }
        }
        const copy = snapshot(project);
        copy.assets.push(...result.assets);
        const index = page.elements.length ? chapter.pages.length : pageIndex;
        if (page.elements.length) copy.chapters[chapterIndex].pages.push(result.page);
        else copy.chapters[chapterIndex].pages[pageIndex] = result.page;
        commit(copy);
        setPageIndex(index);
        setMomentIndex(0);
        setSelected(
          result.page.elements.find((e) => e.kind === 'panel')?.id ?? result.page.elements[0]?.id,
        );
        setNotice(
          result.warnings.length
            ? `${t('svgWarnings')} ${result.warnings.join(', ')}`
            : t('svgNewPage'),
        );
        return;
      }
      throw new Error(t('pageSvgOnly'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (pageInput.current) pageInput.current.value = '';
    }
  }
  function add(kind: Element['kind'], asset?: Asset) {
    if (!asset && kind === 'image') {
      imageInput.current?.click();
      return;
    }
    if (!asset && kind === 'video') {
      videoInput.current?.click();
      return;
    }
    const e = newElement(kind);
    if (asset) {
      e.assetId = asset.id;
      e.name = asset.name;
      if (asset.type === 'video') e.kind = 'video';
    }
    e.name = asset?.name ?? t(kind);
    const parent =
      element?.kind === 'panel' || element?.kind === 'group'
        ? element
        : element?.parentId
          ? page.elements.find((item) => item.id === element.parentId)
          : undefined;
    if (parent && ['bubble', 'text', 'sfx'].includes(kind)) {
      e.parentId = parent.id;
      e.x = parent.x + parent.width * 0.12;
      e.y = parent.y + parent.height * 0.12;
      e.width = Math.min(e.width, parent.width * 0.7);
      e.height = Math.min(e.height, parent.height * 0.45);
    }
    if (kind === 'panel' && page.backgroundAssetId) {
      e.assetId = page.backgroundAssetId;
      e.pageImage = true;
    }
    if (kind === 'image') {
      e.width = 730;
      e.height = 1050;
      e.x = 35;
      e.y = 35;
    }
    const nextMoment = kind === 'panel' ? page.moments.length : momentIndex;
    updatePage((p) => {
      p.elements.push(e);
      if (kind === 'panel')
        p.moments.push({
          id: uid(),
          label: e.name,
          show: [e.id],
          hide: [],
          transition: 'fade',
          duration: 400,
          anchorId: e.id,
        });
      else p.moments[momentIndex]?.show.push(e.id);
    });
    setMomentIndex(nextMoment);
    setSelected(e.id);
  }
  async function importInto(
    file: File | undefined,
    mode: 'art' | 'voice' | 'sfx' | 'music' | 'image' | 'video',
  ) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const asset = await uploadMedia(file, project, ownerId),
        copy = snapshot(project);
      copy.assets.push(asset);
      const p = copy.chapters[chapterIndex].pages[pageIndex];
      if (mode === 'art' && element) {
        const target = p.elements.find((e) => e.id === element.id)!;
        target.assetId = asset.id;
        target.pageImage = false;
      } else if (mode === 'image' || mode === 'video') {
        const e = { ...newElement(mode), name: asset.name, assetId: asset.id };
        if (mode === 'image') {
          e.width = Math.min(600, p.width * 0.8);
          e.height = Math.min(500, p.height * 0.6);
        }
        p.elements.push(e);
        p.moments[momentIndex].show.push(e.id);
        setSelected(e.id);
      } else if (['voice', 'sfx', 'music'].includes(mode)) {
        const m = p.moments[momentIndex];
        if (element) m.anchorId = element.id;
        if (mode === 'voice') m.voiceId = asset.id;
        if (mode === 'sfx') m.sfxId = asset.id;
        if (mode === 'music') {
          m.musicId = asset.id;
          m.stopMusic = false;
        }
      }
      commit(copy);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      for (const ref of [artInput, voiceInput, sfxInput, musicInput, imageInput, videoInput])
        if (ref.current) ref.current.value = '';
    }
  }
  async function importElementSvg(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = importSvg(await file.text()),
        copy = snapshot(project),
        p = copy.chapters[chapterIndex].pages[pageIndex];
      for (const asset of result.assets) {
        if (ownerId) {
          const id = asset.id,
            blob = await (await fetch(asset.src)).blob();
          Object.assign(
            asset,
            await uploadMedia(
              new File([blob], `${id}.${asset.mime.split('/')[1]}`, { type: asset.mime }),
              copy,
              ownerId,
            ),
            { id },
          );
        }
        copy.assets.push(asset);
      }
      if (result.page.elements.length === 1 && element) {
        const source = result.page.elements[0];
        p.elements = p.elements.map((e) =>
          e.id === element.id
            ? {
                ...e,
                points: source.points,
                pathD: source.pathD,
                fill: source.fill,
                stroke: source.stroke,
                strokeWidth: source.strokeWidth,
                assetId: source.assetId ?? e.assetId,
              }
            : e,
        );
      } else {
        const scale =
          Math.min(page.width / result.page.width, page.height / result.page.height) * 0.8;
        const start = p.elements.length;
        result.page.elements.forEach((e) =>
          p.elements.push({
            ...e,
            x: e.x * scale,
            y: e.y * scale,
            width: e.width * scale,
            height: e.height * scale,
          }),
        );
        p.moments.push(...result.page.moments);
        setSelected(p.elements[start].id);
        setMomentIndex(p.moments.length - result.page.moments.length);
      }
      commit(copy);
      if (result.warnings.length) setNotice(`${t('svgWarnings')} ${result.warnings.join(', ')}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (elementSvgInput.current) elementSvgInput.current.value = '';
    }
  }
  function usePreset(source: Element) {
    if (gallery?.replace && element) {
      updateElement({
        points: source.points,
        pathD: source.pathD,
        fill: source.fill,
        stroke: source.stroke,
        strokeWidth: source.strokeWidth,
        fontSize: source.fontSize,
        textColor: source.textColor,
      });
    } else {
      const e = {
        ...source,
        id: uid(),
        name: source.name === source.kind ? t(source.kind) : source.name,
      };
      const parent =
        element?.kind === 'panel'
          ? element
          : element?.parentId
            ? page.elements.find((p) => p.id === element.parentId)
            : undefined;
      if (parent && ['bubble', 'text', 'sfx'].includes(e.kind)) {
        e.parentId = parent.id;
        e.x = parent.x + 20;
        e.y = parent.y + 20;
      }
      const index = e.kind === 'panel' ? page.moments.length : momentIndex;
      updatePage((p) => {
        p.elements.push(e);
        if (e.kind === 'panel')
          p.moments.push({
            id: uid(),
            label: e.name,
            show: [e.id],
            hide: [],
            transition: 'fade',
            duration: 400,
            anchorId: e.id,
          });
        else p.moments[index].show.push(e.id);
      });
      setMomentIndex(index);
      setSelected(e.id);
    }
    setGallery(undefined);
  }
  async function savePreset() {
    if (!element || !templateName.trim()) return;
    setBusy(true);
    try {
      const model = makeTemplate(element, templateName.trim());
      await saveElementTemplate(model, ownerId);
      setPersonalTemplates((models) => [...models, model]);
      setSavingTemplate(false);
      setNotice(t('templateSaved'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function separateReveal() {
    if (!element || element.editorOnly) return;
    const index = page.moments.length;
    updatePage((p) => {
      const prior = p.moments.find((m) => m.anchorId === element.id);
      p.moments.forEach((m) => {
        m.show = m.show.filter((id) => id !== element.id);
      });
      p.moments.push({
        id: uid(),
        label: element.name,
        show: [element.id],
        hide: [],
        transition: 'fade',
        duration: 400,
        anchorId: element.id,
        voiceId: prior?.voiceId,
        sfxId: prior?.sfxId,
        musicId: prior?.musicId,
      });
      if (prior) {
        delete prior.voiceId;
        delete prior.sfxId;
        delete prior.musicId;
      }
    });
    setMomentIndex(index);
  }
  async function doPublish() {
    if (!ownerId) {
      onLogin();
      return;
    }
    setBusy(true);
    setError('');
    try {
      setShare(await publish(project, ownerId, chapter.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeMoment(values: Partial<typeof moment>) {
    updatePage((p) => Object.assign(p.moments[momentIndex], values));
  }
  const mediaSelect = (
    label: string,
    value: string | undefined,
    change: (id: string) => void,
    type?: Asset['type'] | 'visual',
  ) => (
    <label>
      {label}
      <select value={value ?? ''} onChange={(e) => change(e.target.value)}>
        <option value="">{t('none')}</option>
        {project.assets
          .filter((a) => !type || (type === 'visual' ? a.type !== 'audio' : a.type === type))
          .map((a) => (
            <option value={a.id} key={a.id}>
              {a.name}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="studio-identity">
          <button
            className="icon-button"
            aria-label={t('back')}
            onClick={() => {
              onSave(project);
              if (ownerId)
                void saveDraft(project, ownerId)
                  .then(onBack)
                  .catch((e) => setError(e.message));
              else onBack();
            }}
          >
            <ArrowLeft size={19} />
          </button>
          <span className="wordmark">
            komori<span>●</span>
          </span>
          <span className="header-divider" />
          <div>
            <strong>{project.title}</strong>
            <small>
              <Check size={11} /> {t(status as 'local' | 'saving' | 'saved')}
            </small>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-button" disabled={!canUndo} aria-label={t('undo')} onClick={undo}>
            <Undo2 size={17} />
          </button>
          <button className="icon-button" disabled={!canRedo} aria-label={t('redo')} onClick={redo}>
            <Redo2 size={17} />
          </button>
          <button aria-label={t('settings')} onClick={() => setSettings(true)}>
            <Settings size={16} />
          </button>
          <button onClick={() => setPreview(true)}>
            <Play size={15} /> {t('preview')}
          </button>
          <button className="primary" onClick={doPublish} disabled={busy}>
            <Globe size={15} /> {t(busy ? 'publishing' : 'publishChapter')}
          </button>
        </div>
      </header>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}
      <input
        ref={artInput}
        data-import="art"
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        onChange={(e) => void importInto(e.target.files?.[0], 'art')}
      />
      <input
        ref={imageInput}
        data-import="image"
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => void importInto(e.target.files?.[0], 'image')}
      />
      <input
        ref={videoInput}
        data-import="video"
        type="file"
        hidden
        accept="video/mp4,video/webm,image/gif"
        onChange={(e) => void importInto(e.target.files?.[0], 'video')}
      />
      <input
        ref={voiceInput}
        data-import="voice"
        type="file"
        hidden
        accept="audio/*"
        onChange={(e) => void importInto(e.target.files?.[0], 'voice')}
      />
      <input
        ref={sfxInput}
        data-import="sfx"
        type="file"
        hidden
        accept="audio/*"
        onChange={(e) => void importInto(e.target.files?.[0], 'sfx')}
      />
      <input
        ref={musicInput}
        data-import="music"
        type="file"
        hidden
        accept="audio/*"
        onChange={(e) => void importInto(e.target.files?.[0], 'music')}
      />
      <input
        ref={elementSvgInput}
        data-import="element-svg"
        type="file"
        hidden
        accept="image/svg+xml,.svg"
        onChange={(e) => void importElementSvg(e.target.files?.[0])}
      />
      <div className="studio-body" inert={busy}>
        <aside className="left-sidebar">
          <div className="sidebar-tabs">
            {(['pages', 'materials', 'layers'] as const).map((key) => (
              <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                {t(key)}
              </button>
            ))}
          </div>
          {tab === 'pages' && (
            <>
              <div className="sidebar-heading">
                <span>{t('pages')}</span>
                <button
                  className="icon-button"
                  aria-label={t('addChapter')}
                  onClick={() => {
                    update((p) =>
                      p.chapters.push({
                        id: uid(),
                        title: `${t('chapter')} ${p.chapters.length + 1}`,
                        pages: [applyTemplate(newPage(), 'classic')],
                      }),
                    );
                    setChapterIndex(project.chapters.length);
                    setPageIndex(0);
                    setMomentIndex(0);
                    setSelected(undefined);
                  }}
                >
                  <Plus size={17} />
                </button>
              </div>
              <select
                aria-label={t('chapter')}
                value={chapterIndex}
                onChange={(e) => {
                  setChapterIndex(+e.target.value);
                  setPageIndex(0);
                  setMomentIndex(0);
                  setSelected(undefined);
                }}
              >
                {project.chapters.map((c, i) => (
                  <option key={c.id} value={i}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                aria-label={`${t('chapter')} ${t('title')}`}
                value={chapter.title}
                onChange={(e) =>
                  update((p) => {
                    p.chapters[chapterIndex].title = e.target.value;
                  })
                }
              />
              <div className="page-thumbnails">
                {chapter.pages.map((p, i) => (
                  <button
                    className={`page-thumb ${i === pageIndex ? 'active' : ''}`}
                    key={p.id}
                    onClick={() => {
                      setPageIndex(i);
                      setMomentIndex(0);
                      setSelected(undefined);
                    }}
                  >
                    <Canvas page={p} assets={project.assets} reduced />
                    <span>
                      {String(i + 1).padStart(2, '0')} <small>{p.name}</small>
                    </span>
                  </button>
                ))}
              </div>
              {page.backgroundElementId && (
                <button onClick={() => selectElement(page.backgroundElementId!)}>
                  {t('pageArtwork')}
                </button>
              )}
              <details className="sidebar-menu">
                <summary>{t('pageActions')}</summary>
                <button className="danger-button" onClick={() => setPageDeletion(true)}>
                  <Trash2 size={14} /> {t('deletePage')}
                </button>
              </details>
              <button
                className="dashed-button"
                onClick={() => {
                  update((p) => p.chapters[chapterIndex].pages.push(newPage()));
                  setPageIndex(chapter.pages.length);
                  setMomentIndex(0);
                  setSelected(undefined);
                }}
              >
                <Plus size={15} /> {t('addPage')}
              </button>
              <button onClick={() => setTemplates(true)}>{t('templates')}</button>
              <button
                title={t('pageSvgHint')}
                disabled={busy}
                onClick={() => pageInput.current?.click()}
              >
                <Upload size={14} />
                {t('importPage')}
              </button>
              <input
                ref={pageInput}
                data-import="page"
                type="file"
                hidden
                accept="image/svg+xml,.svg"
                onChange={(e) => void importPage(e.target.files?.[0])}
              />
            </>
          )}
          {tab === 'materials' && (
            <>
              <button
                className="primary full"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <Upload size={16} />
                {t('import')}
              </button>
              <input
                ref={input}
                type="file"
                multiple
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/*"
                onChange={(e) => void importFiles(e.target.files)}
              />
              <p className="sidebar-note">{t('emptyMaterials')}</p>
              <div className="asset-grid">
                {project.assets.map((a) => (
                  <button
                    key={a.id}
                    className="asset-card"
                    onClick={() => {
                      if (a.type === 'audio') return;
                      if (element && ['panel', 'image', 'video', 'vector'].includes(element.kind))
                        updateElement({ assetId: a.id, pageImage: false });
                      else add(a.type === 'video' ? 'video' : 'image', a);
                    }}
                    title={a.name}
                  >
                    {a.type === 'image' ? (
                      <img src={a.src} alt="" />
                    ) : (
                      <span>{a.type === 'audio' ? '♫' : '▶'}</span>
                    )}
                    <small>{a.name}</small>
                  </button>
                ))}
              </div>
              <p className="sidebar-note">{t('flatHint')}</p>
            </>
          )}
          {tab === 'layers' && (
            <>
              <div className="sidebar-heading">
                <span>
                  <Layers size={15} /> {t('layers')}
                </span>
              </div>
              {page.elements.map((e, i) => (
                <div className={`layer-row ${e.id === selected ? 'active' : ''}`} key={e.id}>
                  <button onClick={() => selectElement(e.id)}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {e.parentId ? '↳ ' : ''}
                    {e.name}
                  </button>
                  <button
                    aria-label={t('up')}
                    disabled={i === 0}
                    onClick={() =>
                      updatePage((p) => {
                        [p.elements[i - 1], p.elements[i]] = [p.elements[i], p.elements[i - 1]];
                      })
                    }
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    aria-label={t('down')}
                    disabled={i === page.elements.length - 1}
                    onClick={() =>
                      updatePage((p) => {
                        [p.elements[i + 1], p.elements[i]] = [p.elements[i], p.elements[i + 1]];
                      })
                    }
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              ))}
            </>
          )}
          <div className="sidebar-bottom">
            <span className="open-source-dot" /> OPEN SOURCE STUDIO <small>v0.1 · GPLv3</small>
          </div>
        </aside>
        <main className="workspace">
          <div className="canvas-toolbar">
            <div>
              {(['panel', 'bubble', 'text', 'sfx', 'image', 'video'] as const)
                .filter(
                  (kind) => element?.kind !== 'panel' || !['bubble', 'text', 'sfx'].includes(kind),
                )
                .map((kind) => (
                  <button key={kind} onClick={() => add(kind)}>
                    <Plus size={13} />
                    {t(kind)}
                  </button>
                ))}
              <button onClick={() => setGallery({ kind: 'panel', replace: false })}>
                {t('modelLibrary')}
              </button>
            </div>
            <span>
              {page.width} × {page.height}
            </span>
          </div>
          <div className="canvas-workspace">
            <div className="paper-caption">
              {chapter.title} <span>/ {String(pageIndex + 1).padStart(2, '0')}</span>
            </div>
            <div className="editor-paper">
              <Canvas
                page={page}
                assets={project.assets}
                selected={selected}
                onSelect={selectElement}
                onChange={(e) => commitPage(changeElement(page, e))}
              />
            </div>
          </div>
          <section className="timeline">
            <div className="timeline-heading">
              <span>
                <Play size={13} /> {t('moments')}
              </span>
              <small>{t('draftHint')}</small>
              <button
                onClick={() => {
                  updatePage((p) =>
                    p.moments.push({
                      id: uid(),
                      label: `${t('newMoment')} ${p.moments.length + 1}`,
                      show: [],
                      hide: [],
                      transition: 'fade',
                      duration: 400,
                    }),
                  );
                  setMomentIndex(page.moments.length);
                }}
              >
                <Plus size={14} />
                {t('newMoment')}
              </button>
            </div>
            <div className="moment-strip">
              {page.moments.map((m, i) => (
                <button
                  key={m.id}
                  className={`moment-card ${i === momentIndex ? 'active' : ''}`}
                  onClick={() => setMomentIndex(i)}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <strong>{m.label}</strong>
                  <small>
                    {m.show.length} ◇ · {m.duration} ms {m.voiceId ? '♫' : ''}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </main>
        <aside className="right-sidebar">
          <div className="sidebar-heading">{t('properties')}</div>
          {element ? (
            <div className="property-section">
              <div className="section-label">{t(element.kind)}</div>
              <label>
                {t('kind')}
                <select
                  value={element.kind}
                  onChange={(e) => updateElement({ kind: e.target.value as Element['kind'] })}
                >
                  {(
                    ['panel', 'bubble', 'text', 'sfx', 'vector', 'image', 'video', 'group'] as const
                  ).map((kind) => (
                    <option key={kind} value={kind}>
                      {t(kind)}
                    </option>
                  ))}
                </select>
              </label>
              {!element.editorOnly && (
                <label>
                  {t('parentPanel')}
                  <select
                    value={element.parentId ?? ''}
                    onChange={(e) => updateElement({ parentId: e.target.value || undefined })}
                  >
                    <option value="">{t('unlinked')}</option>
                    {page.elements
                      .filter(
                        (e) =>
                          ['panel', 'group'].includes(e.kind) &&
                          e.id !== element.id &&
                          !descendants(page.elements, element.id).has(e.id),
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {['panel', 'bubble', 'text', 'sfx', 'vector'].includes(element.kind) && (
                <div className="element-actions">
                  <button onClick={() => setGallery({ kind: element.kind, replace: true })}>
                    {t('chooseShape')}
                  </button>
                  <details className="sidebar-menu">
                    <summary>{t('modelActions')}</summary>
                    <button
                      onClick={() => {
                        setTemplateName(element.name);
                        setSavingTemplate(true);
                      }}
                    >
                      {t('saveModel')}
                    </button>
                    <button onClick={() => elementSvgInput.current?.click()}>
                      <Upload size={13} />
                      {t('importElement')}
                    </button>
                  </details>
                </div>
              )}
              {element.kind === 'panel' && (
                <section className="context-card">
                  <div className="section-label">{t('panelContent')}</div>
                  <button className="primary full" onClick={() => artInput.current?.click()}>
                    <Upload size={14} />
                    {t('importArt')}
                  </button>
                  <p>{t('frameHint')}</p>
                  <div className="element-actions">
                    <button onClick={() => add('bubble')}>{t('bubbleInPanel')}</button>
                    <button onClick={() => add('text')}>{t('textInPanel')}</button>
                    <button onClick={() => add('sfx')}>{t('sfxInPanel')}</button>
                  </div>
                  {page.elements
                    .filter((child) => child.parentId === element.id)
                    .map((child) => (
                      <button
                        className="linked-child"
                        key={child.id}
                        onClick={() => selectElement(child.id)}
                      >
                        ↳ {child.name}
                      </button>
                    ))}
                </section>
              )}
              {!element.editorOnly && (
                <button className="separate-reveal" onClick={separateReveal}>
                  {t('separateReveal')}
                </button>
              )}
              <label>
                {t('name')}
                <input
                  value={element.name}
                  onChange={(e) => updateElement({ name: e.target.value })}
                />
              </label>
              <div className="field-grid">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <label key={key}>
                    {key === 'width'
                      ? t('width')
                      : key === 'height'
                        ? t('height')
                        : key.toUpperCase()}
                    <input
                      type="number"
                      value={element[key]}
                      min={key === 'width' || key === 'height' ? 10 : undefined}
                      onChange={(e) =>
                        updateElement({
                          [key]:
                            key === 'width' || key === 'height'
                              ? Math.max(10, +e.target.value)
                              : +e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              {['bubble', 'text', 'sfx'].includes(element.kind) && (
                <>
                  <label>
                    {t('text')}
                    <textarea
                      value={element.text}
                      onChange={(e) => updateElement({ text: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('font')}
                    <input
                      type="number"
                      min="8"
                      max="160"
                      value={element.fontSize}
                      onChange={(e) => updateElement({ fontSize: Math.max(8, +e.target.value) })}
                    />
                  </label>
                </>
              )}
              <details className="sidebar-menu">
                <summary>{t('appearance')}</summary>
                <div className="field-grid">
                  <label>
                    {t('fill')}
                    <input
                      type="color"
                      value={/^#[\da-f]{6}$/i.test(element.fill) ? element.fill : '#ffffff'}
                      onChange={(e) => updateElement({ fill: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('stroke')}
                    <input
                      type="color"
                      value={/^#[\da-f]{6}$/i.test(element.stroke) ? element.stroke : '#222521'}
                      onChange={(e) => updateElement({ stroke: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  {t('stroke')} px
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={element.strokeWidth}
                    onChange={(e) => updateElement({ strokeWidth: Math.max(0, +e.target.value) })}
                  />
                </label>
              </details>
              {['panel', 'image', 'video', 'vector'].includes(element.kind) && (
                <details className="sidebar-menu">
                  <summary>{t('crop')}</summary>
                  {element.kind !== 'panel' && (
                    <button className="primary full" onClick={() => artInput.current?.click()}>
                      <Upload size={14} />
                      {t('importImage')}
                    </button>
                  )}
                  {mediaSelect(
                    t('media'),
                    element.assetId,
                    (id) => updateElement({ assetId: id, pageImage: false }),
                    'visual',
                  )}
                  <label>
                    {t('scale')}
                    <input
                      type="range"
                      min=".2"
                      max="4"
                      step=".05"
                      value={element.imageScale}
                      onChange={(e) => updateElement({ imageScale: +e.target.value })}
                    />
                  </label>
                  <div className="field-grid">
                    <label>
                      X
                      <input
                        type="number"
                        value={element.imageX}
                        onChange={(e) => updateElement({ imageX: +e.target.value })}
                      />
                    </label>
                    <label>
                      Y
                      <input
                        type="number"
                        value={element.imageY}
                        onChange={(e) => updateElement({ imageY: +e.target.value })}
                      />
                    </label>
                  </div>
                  {mediaSelect(
                    t('poster'),
                    element.posterId,
                    (id) => updateElement({ posterId: id }),
                    'image',
                  )}
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={element.loop}
                      onChange={(e) => updateElement({ loop: e.target.checked })}
                    />
                    {t('loop')}
                  </label>
                </details>
              )}
              <details className="sidebar-menu">
                <summary>{t('advancedShape')}</summary>
                {element.pathD && (
                  <label>
                    {t('pathData')}
                    <textarea
                      value={element.pathD}
                      onChange={(e) => updateElement({ pathD: e.target.value.slice(0, 100000) })}
                    />
                  </label>
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={element.fill === 'none'}
                    onChange={(e) => updateElement({ fill: e.target.checked ? 'none' : '#ffffff' })}
                  />
                  {t('noFill')}
                </label>
                {element.kind === 'panel' && !element.pathD && (
                  <>
                    <div className="section-label">{t('vertices')}</div>
                    {element.points.map((point, i) => (
                      <div className="point-fields" key={i}>
                        <span>{i + 1}</span>
                        {(['x', 'y', 'curve'] as const).map((key) => (
                          <input
                            key={key}
                            aria-label={`${t(key === 'curve' ? 'curve' : 'vertices')} ${i + 1} ${key}`}
                            type="number"
                            step=".05"
                            min={key === 'curve' ? -0.5 : 0}
                            max={key === 'curve' ? 0.5 : 1}
                            value={point[key] ?? 0}
                            onChange={(e) => {
                              const points = structuredClone(element.points);
                              points[i][key] = Math.max(
                                key === 'curve' ? -0.5 : 0,
                                Math.min(key === 'curve' ? 0.5 : 1, +e.target.value),
                              );
                              updateElement({ points });
                            }}
                          />
                        ))}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const points = structuredClone(element.points);
                        const a = points.at(-1)!,
                          b = points[0];
                        points.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
                        updateElement({ points });
                      }}
                    >
                      {t('addVertex')}
                    </button>
                  </>
                )}
              </details>
              <div className="button-row">
                <button
                  aria-label={t('duplicate')}
                  onClick={() => {
                    const copy = duplicateElement(page, element.id);
                    commitPage(copy.page);
                    setSelected(copy.id);
                  }}
                >
                  <Copy size={15} />
                </button>
                <button aria-label={t('delete')} onClick={removeSelected}>
                  <Trash2 size={15} /> {t('delete')} · Del
                </button>
              </div>
            </div>
          ) : (
            <p className="sidebar-note">{t('selectedHint')}</p>
          )}
          <div className="property-section moment-properties">
            <div className="section-label">
              {String(momentIndex + 1).padStart(2, '0')} · {t('moments')}
            </div>
            <details className="sidebar-menu">
              <summary>{t('momentSettings')}</summary>
              <label>
                {t('name')}
                <input
                  value={moment.label}
                  onChange={(e) => changeMoment({ label: e.target.value })}
                />
              </label>
              <div className="field-grid">
                <label>
                  {t('transition')}
                  <select
                    value={moment.transition}
                    onChange={(e) =>
                      changeMoment({ transition: e.target.value as typeof moment.transition })
                    }
                  >
                    {(['none', 'fade', 'slide', 'zoom', 'shake'] as const).map((v) => (
                      <option key={v} value={v}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('duration')}
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={moment.duration}
                    onChange={(e) =>
                      changeMoment({ duration: Math.max(0, Math.min(10000, +e.target.value)) })
                    }
                  />
                </label>
              </div>
              <details>
                <summary>
                  {t('reveal')} / {t('hide')}
                </summary>
                {page.elements.map((e) => (
                  <div className="reveal-row" key={e.id}>
                    <span>{e.name}</span>
                    {(['show', 'hide'] as const).map((action) => (
                      <input
                        key={action}
                        type="checkbox"
                        aria-label={`${t(action === 'show' ? 'reveal' : 'hide')} ${e.name}`}
                        checked={moment[action].includes(e.id)}
                        onChange={(event) =>
                          changeMoment({
                            [action]: event.target.checked
                              ? [...moment[action], e.id]
                              : moment[action].filter((id) => id !== e.id),
                          })
                        }
                      />
                    ))}
                  </div>
                ))}
              </details>
            </details>
            <details className="sidebar-menu">
              <summary>{t('audioSettings')}</summary>
              <p className="sidebar-note">{t('audioHint')}</p>
              <div className="audio-import-actions">
                <button onClick={() => voiceInput.current?.click()}>
                  <Upload size={13} />
                  {t('importVoice')}
                </button>
                <button onClick={() => sfxInput.current?.click()}>
                  <Upload size={13} />
                  {t('importSfx')}
                </button>
                <button onClick={() => musicInput.current?.click()}>
                  <Upload size={13} />
                  {t('importMusic')}
                </button>
              </div>
              {mediaSelect(
                t('voice'),
                moment.voiceId,
                (id) => changeMoment({ voiceId: id }),
                'audio',
              )}
              {mediaSelect(t('sound'), moment.sfxId, (id) => changeMoment({ sfxId: id }), 'audio')}
              {mediaSelect(
                t('music'),
                moment.musicId,
                (id) => changeMoment({ musicId: id, stopMusic: false }),
                'audio',
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!moment.stopMusic}
                  onChange={(e) => changeMoment({ stopMusic: e.target.checked })}
                />
                {t('stopMusic')}
              </label>
            </details>
            <div className="button-row">
              <button
                disabled={momentIndex === 0}
                aria-label={`${t('up')} ${t('moments')}`}
                onClick={() => {
                  updatePage((p) => {
                    [p.moments[momentIndex - 1], p.moments[momentIndex]] = [
                      p.moments[momentIndex],
                      p.moments[momentIndex - 1],
                    ];
                  });
                  setMomentIndex((i) => i - 1);
                }}
              >
                <ChevronUp size={15} />
              </button>
              <button
                disabled={momentIndex === page.moments.length - 1}
                aria-label={`${t('down')} ${t('moments')}`}
                onClick={() => {
                  updatePage((p) => {
                    [p.moments[momentIndex + 1], p.moments[momentIndex]] = [
                      p.moments[momentIndex],
                      p.moments[momentIndex + 1],
                    ];
                  });
                  setMomentIndex((i) => i + 1);
                }}
              >
                <ChevronDown size={15} />
              </button>
              <button
                disabled={page.moments.length === 1}
                aria-label={`${t('delete')} ${t('moments')}`}
                onClick={() => {
                  updatePage((p) => p.moments.splice(momentIndex, 1));
                  setMomentIndex((i) => Math.max(0, i - 1));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </aside>
      </div>
      {preview && (
        <Reader
          project={project}
          initialChapter={chapterIndex}
          initialPage={pageIndex}
          language={language}
          onClose={() => setPreview(false)}
        />
      )}
      {gallery && (
        <TemplateGallery
          language={language}
          kind={gallery.kind}
          templates={personalTemplates}
          onClose={() => setGallery(undefined)}
          onApply={usePreset}
          onDelete={(id) => {
            void removeElementTemplate(id, ownerId)
              .then(() => setPersonalTemplates((models) => models.filter((m) => m.id !== id)))
              .catch((e) => setError(e.message));
          }}
        />
      )}
      {savingTemplate && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <header>
              <h2>{t('saveModel')}</h2>
              <button
                disabled={busy}
                aria-label={t('close')}
                onClick={() => setSavingTemplate(false)}
              >
                ×
              </button>
            </header>
            <label>
              {t('modelName')}
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </label>
            <button
              className="primary"
              disabled={busy || !templateName.trim()}
              onClick={() => void savePreset()}
            >
              {t('save')}
            </button>
            {error && <p className="error-text">{error}</p>}
          </section>
        </div>
      )}
      {pageDeletion && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <header>
              <h2>
                {t('deletePage')} {pageIndex + 1}
              </h2>
            </header>
            <p>{t('deletePageHint')}</p>
            <div className="button-row">
              <button onClick={() => setPageDeletion(false)}>{t('cancel')}</button>
              <button
                className="danger-button"
                onClick={() => {
                  const copy = deletePage(project, chapterIndex, pageIndex);
                  commit(copy);
                  setPageIndex((i) => Math.min(i, copy.chapters[chapterIndex].pages.length - 1));
                  setMomentIndex(0);
                  setSelected(undefined);
                  setPageDeletion(false);
                }}
              >
                {t('removePage')}
              </button>
            </div>
          </section>
        </div>
      )}
      {settings && (
        <div className="modal-backdrop">
          <section className="modal">
            <header>
              <h2>{t('settings')}</h2>
              <button aria-label={t('close')} onClick={() => setSettings(false)}>
                ×
              </button>
            </header>
            <label>
              {t('title')}
              <input
                value={project.title}
                onChange={(e) =>
                  update((p) => {
                    p.title = e.target.value;
                  })
                }
              />
            </label>
            <label>
              {t('author')}
              <input
                value={project.author}
                onChange={(e) =>
                  update((p) => {
                    p.author = e.target.value;
                  })
                }
              />
            </label>
            <label>
              {t('description')}
              <textarea
                value={project.description}
                onChange={(e) =>
                  update((p) => {
                    p.description = e.target.value;
                  })
                }
              />
            </label>
            <div className="field-grid">
              <label>
                {t('language')}
                <select
                  value={project.language}
                  onChange={(e) =>
                    update((p) => {
                      p.language = e.target.value as Language;
                    })
                  }
                >
                  <option value="pt-BR">Português brasileiro</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                {t('direction')}
                <select
                  value={project.direction}
                  onChange={(e) =>
                    update((p) => {
                      p.direction = e.target.value as 'rtl' | 'ltr';
                    })
                  }
                >
                  <option value="rtl">←</option>
                  <option value="ltr">→</option>
                </select>
              </label>
            </div>
            {mediaSelect(
              t('cover'),
              project.coverId,
              (id) =>
                update((p) => {
                  p.coverId = id;
                }),
              'image',
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={project.adult}
                onChange={(e) =>
                  update((p) => {
                    p.adult = e.target.checked;
                  })
                }
              />
              {t('adult')}
            </label>
            <div className="section-label">{t('support')}</div>
            {project.support.map((link, i) => (
              <div key={i} className="link-fields">
                <input
                  aria-label={`${t('name')} ${i + 1}`}
                  value={link.label}
                  onChange={(e) =>
                    update((p) => {
                      p.support[i].label = e.target.value;
                    })
                  }
                />
                <input
                  aria-label={`URL ${i + 1}`}
                  placeholder="https://…"
                  value={link.url}
                  onChange={(e) =>
                    update((p) => {
                      p.support[i].url = e.target.value;
                    })
                  }
                  aria-invalid={!!link.url && !safeLink(link.url)}
                />
                <button
                  aria-label={t('delete')}
                  onClick={() => update((p) => p.support.splice(i, 1))}
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={() => update((p) => p.support.push({ label: '', url: '' }))}>
              <Plus size={15} />
              {t('addLink')}
            </button>
            <button className="primary full" onClick={() => setSettings(false)}>
              {t('close')}
            </button>
          </section>
        </div>
      )}
      {templates && (
        <div className="modal-backdrop">
          <section className="modal">
            <header>
              <h2>{t('templates')}</h2>
              <button onClick={() => setTemplates(false)}>×</button>
            </header>
            <p>{t('templateHint')}</p>
            <div className="template-options">
              {(['classic', 'diagonal', 'splash'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    update((p) => {
                      p.chapters[chapterIndex].pages[pageIndex] = applyTemplate(page, key);
                    });
                    setTemplates(false);
                  }}
                >
                  <ImageIcon />
                  {t(key)}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {share && (
        <div className="modal-backdrop">
          <section className="modal">
            <header>
              <h2>{t('published')}</h2>
              <button aria-label={t('close')} onClick={() => setShare('')}>
                ×
              </button>
            </header>
            <p>{t('draftHint')}</p>
            <input readOnly value={share} aria-label={t('share')} />
            <button
              className="primary"
              onClick={() => {
                void navigator.clipboard.writeText(share);
              }}
            >
              {t('copy')}
            </button>
            <a href={share} target="_blank" rel="noopener noreferrer">
              {t('reader')} ↗
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
