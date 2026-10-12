import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X, Volume2, RotateCcw, Minus, Plus, Play } from 'lucide-react';
import {
  advance,
  back,
  initialPlayback,
  readerVisibleIds,
  musicAt,
  momentAudioCues,
  musicVolumeAt,
  type Project,
  type Playback,
} from './core';
import { Canvas } from './Canvas';
import { startAudioSequence, type AudioLike } from './audioDirection';
import { tr, type Language } from './i18n';
export function Reader({
  project,
  language,
  onClose,
  initialChapter = 0,
  initialPage = 0,
  initialMoment = 0,
}: {
  project: Project;
  language: Language;
  onClose: () => void;
  initialChapter?: number;
  initialPage?: number;
  initialMoment?: number;
}) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const [accepted, setAccepted] = useState(!project.adult);
  const [chapter, setChapter] = useState(initialChapter),
    [pageIndex, setPageIndex] = useState(initialPage);
  const [state, setState] = useState<Playback>(() => ({
      ...initialPlayback(),
      index: Math.max(
        0,
        Math.min(
          initialMoment,
          project.chapters[initialChapter].pages[initialPage].moments.length - 1,
        ),
      ),
    })),
    [zoom, setZoom] = useState(1);
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const [muted, setMuted] = useState(false),
    [volumes, setVolumes] = useState({ voice: 0.8, sfx: 0.8, music: 0.3 });
  const [started, setStarted] = useState(false);
  const tracks = useRef<{
    sequence?: ReturnType<typeof startAudioSequence>;
    music?: HTMLAudioElement;
    musicId?: string;
    musicGain?: number;
    activated?: boolean;
  }>({});
  const currentChapter = project.chapters[chapter],
    page = currentChapter.pages[pageIndex],
    moment = page.moments[state.index];
  const stop = useCallback(() => {
    tracks.current.sequence?.stop();
    tracks.current.sequence = undefined;
  }, []);
  const playMoment = useCallback(
    (finishTransition = false) => {
      stop();
      if (muted || !moment) return;
      tracks.current.sequence = startAudioSequence(
        momentAudioCues(page, state.index, reduced || finishTransition),
        (id) => {
          const asset = project.assets.find((a) => a.id === id);
          return asset?.src ? (new Audio(asset.src) as unknown as AudioLike) : undefined;
        },
        volumes,
      );
    },
    [moment, page, state.index, state.transitioning, reduced, muted, project.assets, stop, volumes],
  );
  const previousMoments = project.chapters.flatMap((c, ci) =>
    ci < chapter
      ? c.pages.flatMap((p) => p.moments)
      : ci === chapter
        ? c.pages.slice(0, pageIndex).flatMap((p) => p.moments)
        : [],
  );
  const musicId = musicAt(
    [...previousMoments, ...page.moments],
    previousMoments.length + state.index,
  );
  const authorMusicVolume = musicVolumeAt(
    [...previousMoments, ...page.moments],
    previousMoments.length + state.index,
  );
  useEffect(() => {
    if (!accepted || !started || muted) {
      tracks.current.music?.pause();
      return;
    }
    if (!tracks.current.activated || state.playAudio) tracks.current.musicGain = authorMusicVolume;
    if ((!tracks.current.activated || state.playAudio) && tracks.current.musicId !== musicId) {
      tracks.current.music?.pause();
      tracks.current.music = undefined;
      tracks.current.musicId = musicId;
      const asset = project.assets.find((a) => a.id === musicId);
      if (asset?.src) {
        tracks.current.music = new Audio(asset.src);
        tracks.current.music.loop = true;
      }
    }
    tracks.current.activated = true;
    if (tracks.current.music) {
      tracks.current.music.volume = volumes.music * (tracks.current.musicGain ?? authorMusicVolume);
      void tracks.current.music.play().catch(() => {});
    }
  }, [
    musicId,
    state.playAudio,
    accepted,
    started,
    muted,
    volumes.music,
    authorMusicVolume,
    project.assets,
  ]);
  useEffect(() => {
    if (muted) stop();
    else {
      tracks.current.sequence?.setLevels(volumes);
    }
  }, [muted, stop, volumes]);
  useEffect(
    () => () => {
      stop();
      tracks.current.music?.pause();
    },
    [stop],
  );
  useEffect(() => {
    if (!state.transitioning || !started) return;
    if (reduced || !moment?.duration) {
      setState((s) => ({ ...s, transitioning: false }));
      return;
    }
    const timer = setTimeout(
      () => setState((s) => ({ ...s, transitioning: false })),
      moment.duration,
    );
    return () => clearTimeout(timer);
  }, [state.index, state.transitioning, moment?.duration, reduced, started]);
  const next = useCallback(() => {
    if (!accepted) return;
    setStarted(true);
    if (!started) {
      playMoment();
      setState((s) => ({
        ...s,
        transitioning: !reduced && moment.transition !== 'none' && moment.duration > 0,
      }));
      return;
    }
    if (state.transitioning) {
      tracks.current.sequence?.finishTransition();
      setState(advance(state, page.moments));
      return;
    }
    stop();
    if (state.index < page.moments.length - 1) {
      const nextState = advance(state, page.moments);
      setState(nextState);
    } else if (pageIndex < currentChapter.pages.length - 1) {
      setPageIndex((i) => i + 1);
      setState({ ...initialPlayback(), playAudio: true });
    } else if (chapter < project.chapters.length - 1) {
      setChapter((i) => i + 1);
      setPageIndex(0);
      setState({ ...initialPlayback(), playAudio: true });
    }
  }, [
    accepted,
    started,
    reduced,
    moment,
    playMoment,
    state,
    page.moments,
    stop,
    pageIndex,
    currentChapter.pages.length,
    chapter,
    project.chapters.length,
  ]);
  const previous = useCallback(() => {
    stop();
    if (state.index > 0) setState(back(state));
    else if (pageIndex > 0) {
      const prev = currentChapter.pages[pageIndex - 1];
      setPageIndex((i) => i - 1);
      setState({ index: prev.moments.length - 1, transitioning: false, playAudio: false });
    } else if (chapter > 0) {
      const prev = project.chapters[chapter - 1];
      setChapter((i) => i - 1);
      setPageIndex(prev.pages.length - 1);
      setState({
        index: prev.pages.at(-1)!.moments.length - 1,
        transitioning: false,
        playAudio: false,
      });
    }
  }, [stop, state, pageIndex, currentChapter.pages, chapter, project.chapters]);
  // Only a forward entry plays audio. Finishing a transition and going backwards do not.
  useEffect(() => {
    if (state.playAudio && accepted && started) playMoment();
  }, [page.id, state.index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.target as HTMLElement)?.matches('input,select,textarea')) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      }
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [next, previous, onClose]);
  if (!accepted)
    return (
      <div className="reader-overlay">
        <section className="adult-gate">
          <span className="adult-symbol">18+</span>
          <h1>{t('warning')}</h1>
          <p>{t('warningDetail')}</p>
          <button className="primary" onClick={() => setAccepted(true)}>
            {t('enterAdult')}
          </button>
          <button onClick={onClose}>{t('back')}</button>
        </section>
      </div>
    );
  return (
    <div className="reader-overlay">
      <header className="reader-header">
        <button className="icon-button" aria-label={t('close')} onClick={onClose}>
          <X size={20} />
        </button>
        <div>
          <strong>{project.title}</strong>
          <small>
            {currentChapter.title} · {pageIndex + 1}/{currentChapter.pages.length}
          </small>
        </div>
        <span className="reader-brand">komori</span>
      </header>
      <div className="reader-scroll">
        <div
          className="reader-page"
          style={{ width: `calc(min(620px, 100vw - 24px) * ${zoom})`, maxWidth: 'none' }}
          onClick={next}
          onContextMenu={(e) => {
            e.preventDefault();
            previous();
          }}
        >
          <Canvas
            page={page}
            assets={project.assets}
            visible={readerVisibleIds(page, state.index, state.transitioning && started, reduced)}
            animated={state.transitioning && started ? new Set(moment?.show) : undefined}
            transition={moment?.transition}
            duration={moment?.duration}
            reduced={reduced}
          />
        </div>
      </div>
      <footer className="reader-controls">
        <div className="reader-navigation">
          <button onClick={previous} aria-label={t('back')}>
            <ArrowLeft size={18} />
          </button>
          <span aria-live="polite">
            {state.index + 1} / {page.moments.length}
          </span>
          <button
            className="primary"
            title={t(!started ? 'startReading' : 'next')}
            onClick={next}
            aria-label={t('next')}
          >
            {!started ? <Play size={18} /> : <ArrowRight size={18} />}
          </button>
          <button
            onClick={() => {
              setStarted(true);
              playMoment(true);
            }}
            aria-label={t('replay')}
          >
            <RotateCcw size={17} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            aria-label={`${t('zoom')} −`}
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            aria-label={`${t('zoom')} +`}
          >
            <Plus size={16} />
          </button>
        </div>
        <details>
          <summary>
            <Volume2 size={17} /> {t('settings')}
          </summary>
          <div className="audio-settings">
            <label>
              <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
              {t('muted')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
              {t('reduce')}
            </label>
            {(['voice', 'sfx', 'music'] as const).map((kind) => (
              <label key={kind}>
                {t(kind === 'sfx' ? 'sound' : kind)}
                <input
                  aria-label={t(kind === 'sfx' ? 'sound' : kind)}
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={volumes[kind]}
                  onChange={(e) => setVolumes((v) => ({ ...v, [kind]: +e.target.value }))}
                />
              </label>
            ))}
          </div>
        </details>
        <small>{t(!started ? 'startReading' : 'help')}</small>
      </footer>
    </div>
  );
}
