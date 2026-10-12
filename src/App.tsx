import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { ArrowUpRight, Plus, Code2, BookOpen, Layers, Play, X, Heart, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));
import { Reader } from './Reader';
import { Canvas } from './Canvas';
import { cloud, loadPublished, loadWorks, deleteWork } from './cloud';
import { createProject, safeLink, uid, type Project } from './core';
import { demoProject } from './demo';
import { localSave, localWorks, localDelete } from './local';
import { tr, type Language } from './i18n';
export function App() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('komori-language') === 'en' ? 'en' : 'pt-BR',
  );
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const [session, setSession] = useState<Session | null>(null),
    [works, setWorks] = useState<Project[]>([]),
    [editing, setEditing] = useState<Project>();
  const [auth, setAuth] = useState(false),
    [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'recover'>('login');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const [readerChapter, setReaderChapter] = useState(0);
  const [deleting, setDeleting] = useState<Project>();
  const [published, setPublished] = useState<Project>(),
    [reading, setReading] = useState(false),
    [adultAccepted, setAdultAccepted] = useState(false);
  const [loading, setLoading] = useState(location.pathname.startsWith('/m/'));
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('komori-language', language);
  }, [language]);
  useEffect(() => {
    if (!cloud) return;
    void cloud.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = cloud.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recover');
        setAuth(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const request = session ? loadWorks() : localWorks();
    void request
      .then((data) => {
        if (!cancelled) setWorks(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);
  useEffect(() => {
    const id = location.pathname.match(/^\/m\/([0-9a-f-]+)\/?$/)?.[1];
    if (!id) {
      setLoading(false);
      return;
    }
    void loadPublished(id)
      .then((p) => {
        setPublished(p);
        setAdultAccepted(!p.adult);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const save = useCallback(
    (project: Project) => {
      setWorks((existing) => [project, ...existing.filter((w) => w.id !== project.id)]);
      if (!cloud || !session) void localSave(project).catch((e) => setError(e.message));
    },
    [session],
  );
  async function confirmDeletion() {
    if (!deleting) return;
    setBusy(true);
    setError('');
    try {
      if (session) {
        const result = await deleteWork(deleting.id, session.user.id);
        if (result.cleanupFailed) setError(t('cleanupWarning'));
      } else await localDelete(deleting.id);
      setWorks((existing) => existing.filter((work) => work.id !== deleting.id));
      setDeleting(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!cloud) throw new Error(t('notConfigured'));
      if (authMode === 'recover') {
        const { error } = await cloud.auth.updateUser({ password });
        if (error) throw error;
        setAuth(false);
        return;
      }
      if (authMode === 'reset') {
        const { error } = await cloud.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (error) throw error;
        setMessage(t('signupHint'));
        return;
      }
      const result =
        authMode === 'signup'
          ? await cloud.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: location.origin },
            })
          : await cloud.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) {
        setAuth(false);
        setPassword('');
      } else setMessage(t('signupHint'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function newWork() {
    const project = createProject();
    setEditing(project);
    save(project);
  }
  if (loading)
    return (
      <div className="loading-page">
        komori<span>{t('loading')}</span>
      </div>
    );
  if (editing)
    return (
      <>
        <Suspense fallback={<div className="loading-page">{t('loading')}</div>}>
          <Editor
            key={editing.id}
            initial={editing}
            language={language}
            ownerId={session?.user.id}
            onBack={() => setEditing(undefined)}
            onSave={save}
            onLogin={() => {
              setAuthMode('login');
              setAuth(true);
            }}
          />
        </Suspense>
        {authDialog()}
      </>
    );
  if (published) {
    if (!adultAccepted)
      return (
        <div className="adult-gate public-gate">
          <span className="adult-symbol">18+</span>
          <h1>{t('warning')}</h1>
          <p>{t('warningDetail')}</p>
          <button className="primary" onClick={() => setAdultAccepted(true)}>
            {t('enterAdult')}
          </button>
          <a href="/">{t('back')}</a>
        </div>
      );
    const cover = published.assets.find((a) => a.id === published.coverId);
    return (
      <main className="public-work">
        <a className="wordmark" href="/">
          komori<span>●</span>
        </a>
        <div className="work-intro">
          {cover && <img className="public-cover" src={cover.src} alt={published.title} />}
          <section>
            <span className="eyebrow">
              {published.language} {published.adult ? '· 18+' : ''}
            </span>
            <h1>{published.title}</h1>
            <p className="byline">{published.author}</p>
            <p>{published.description}</p>
            <button
              className="primary"
              onClick={() => {
                setReaderChapter(0);
                setReading(true);
              }}
            >
              <BookOpen size={18} />
              {t('reader')}
            </button>
            <div className="support-links">
              {published.support
                .filter((s) => safeLink(s.url))
                .map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
                    <Heart size={15} />
                    {s.label}
                    <ArrowUpRight size={15} />
                  </a>
                ))}
            </div>
            <ol className="chapter-list">
              {published.chapters.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setReaderChapter(i);
                      setReading(true);
                    }}
                  >
                    {c.title}
                  </button>
                  <small>
                    {c.pages.length} {t('pages').toLowerCase()}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        {reading && (
          <Reader
            project={published}
            initialChapter={readerChapter}
            language={language}
            onClose={() => setReading(false)}
          />
        )}
      </main>
    );
  }
  const demo = demoProject();
  return (
    <div className="home">
      <header className="home-header">
        <a className="wordmark" href="/">
          komori<span>●</span>
        </a>
        <nav>
          <a href="#works">{t('works')}</a>
          <a
            href="https://github.com/DiegoLopesV/komori-manga"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code2 size={15} /> GitHub
          </a>
          <div className="language-switch">
            <button
              aria-label="Português brasileiro"
              className={language === 'pt-BR' ? 'active' : ''}
              onClick={() => setLanguage('pt-BR')}
            >
              PT
            </button>
            <button
              aria-label="English"
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
          <button
            onClick={() => {
              if (session) void cloud?.auth.signOut();
              else {
                setAuthMode('login');
                setAuth(true);
              }
            }}
          >
            {t(session ? 'logout' : 'login')}
            <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> {t('free')}
          </div>
          <h1>{t('hero')}</h1>
          <p className="hero-tagline">{t('tagline')}</p>
          <p className="hero-description">{t('intro')}</p>
          <div className="hero-actions">
            <button className="primary" onClick={newWork}>
              {t('start')}
              <ArrowUpRight size={18} />
            </button>
            <button className="text-button" onClick={() => setEditing({ ...demo, id: uid() })}>
              <Play size={15} />
              {t('demo')}
            </button>
          </div>
          <div className="hero-footnote">
            <span>01 — 04</span>
            {t('landingNote')}
          </div>
        </div>
        <div className="hero-art">
          <span className="art-label">AFTER THE RAIN / 001</span>
          <div className="hero-paper">
            <Canvas page={demo.chapters[0].pages[0]} assets={demo.assets} reduced />
          </div>
          <span className="art-stamp">
            YOUR STORY
            <br />
            UNFOLDS HERE ↘
          </span>
          <div className="art-number">01</div>
        </div>
      </section>
      <section className="feature-row">
        {[Layers, Play, GlobeIcon].map((Icon, i) => (
          <div key={i}>
            <span className="feature-number">0{i + 1}</span>
            <Icon size={21} />
            <h3>{t(`feature${i + 1}` as 'feature1')}</h3>
            <p>{t(`detail${i + 1}` as 'detail1')}</p>
          </div>
        ))}
      </section>
      <section className="works-section" id="works">
        <header>
          <div>
            <span className="eyebrow">{t('studio')}</span>
            <h2>{t('works')}</h2>
          </div>
          <button onClick={newWork}>
            <Plus size={17} />
            {t('newWork')}
          </button>
        </header>
        {!session && (
          <p className="library-note">
            {t('local')} · {t('authHint')}
          </p>
        )}
        <div className="work-grid">
          {works.map((work) => (
            <article className="work-entry" key={work.id}>
              <button className="work-card" key={work.id} onClick={() => setEditing(work)}>
                <div className="work-cover">
                  {work.adult ? (
                    <span className="adult-symbol">18+</span>
                  ) : work.assets.find((a) => a.id === work.coverId)?.src ? (
                    <img src={work.assets.find((a) => a.id === work.coverId)!.src} alt="" />
                  ) : (
                    <Canvas page={work.chapters[0].pages[0]} assets={work.assets} reduced />
                  )}
                  <span className="draft-badge">{t('studio')}</span>
                </div>
                <div className="work-card-footer">
                  <div>
                    <h3>{work.title}</h3>
                    <small>
                      {work.chapters.length} {t('chapter').toLowerCase()} · {work.language}
                    </small>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
              </button>
              <button
                className="work-delete"
                aria-label={`${t('deleteWork')} ${work.title}`}
                title={t('deleteWork')}
                onClick={() => setDeleting(work)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          <button className="new-work-card" onClick={newWork}>
            <Plus size={32} />
            <strong>{t('newWork')}</strong>
            <small>{t('noWorks')}</small>
          </button>
        </div>
      </section>
      <footer className="home-footer">
        <span className="wordmark">
          komori<span>●</span>
        </span>
        <span>{t('free')}</span>
        <a href="https://github.com/DiegoLopesV/komori-manga">GitHub ↗</a>
      </footer>
      {authDialog()}
      {deleting && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-work-title"
          >
            <header>
              <h2 id="delete-work-title">
                {t('deleteWork')} “{deleting.title}”
              </h2>
            </header>
            <p>{t('deleteWorkWarning')}</p>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button disabled={busy} onClick={() => setDeleting(undefined)}>
                {t('cancel')}
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={() => void confirmDeletion()}
              >
                {t('deleteForever')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
  function authDialog() {
    return (
      auth && (
        <div className="modal-backdrop">
          <section className="modal auth-modal">
            <header>
              <h2>{t(authMode === 'recover' ? 'restore' : 'account')}</h2>
              <button aria-label={t('close')} onClick={() => setAuth(false)}>
                <X size={18} />
              </button>
            </header>
            <p>{t('authHint')}</p>
            {import.meta.env.VITE_PILOT_MODE === 'true' && <p className="notice">{t('pilot')}</p>}
            {!cloud && <p className="notice">{t('notConfigured')}</p>}
            <form onSubmit={submitAuth}>
              {authMode !== 'recover' && (
                <label>
                  {t('email')}
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {authMode !== 'reset' && (
                <label>
                  {t('password')}
                  <input
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}
              <button className="primary full" disabled={busy || !cloud}>
                {t(
                  authMode === 'signup'
                    ? 'signup'
                    : authMode === 'reset'
                      ? 'reset'
                      : authMode === 'recover'
                        ? 'restore'
                        : 'login',
                )}
              </button>
            </form>
            {message && <p role="status">{message}</p>}
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <div className="auth-options">
              {(['login', 'signup', 'reset'] as const)
                .filter((mode) => mode !== authMode)
                .map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAuthMode(mode);
                      setMessage('');
                      setError('');
                    }}
                  >
                    {t(mode)}
                  </button>
                ))}
            </div>
          </section>
        </div>
      )
    );
  }
}
function GlobeIcon({ size = 21 }: { size?: number }) {
  return <BookOpen size={size} />;
}
