import type { Ref } from 'react';
import { ChevronUp, ChevronDown, Play } from 'lucide-react';
import {
  momentAudioCues,
  reorderDialogue,
  changeElement,
  type Page,
  type Asset,
  type Element,
} from './core';
import { tr, type Language } from './i18n';
export function AudioSequence({
  page,
  index,
  assets,
  language,
  detailsRef,
  onChange,
  onSelect,
  onTest,
}: {
  page: Page;
  index: number;
  assets: Asset[];
  language: Language;
  detailsRef: Ref<HTMLDetailsElement>;
  onChange: (page: Page) => void;
  onSelect: (id: string) => void;
  onTest: () => void;
}) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key),
    cues = momentAudioCues(page, index);
  return (
    <details ref={detailsRef} className="sidebar-menu cue-sequence">
      <summary>{t('audioSequence')}</summary>
      <p className="sidebar-note">{t('sequenceHint')}</p>
      {cues.length === 0 && <p className="sidebar-note">{t('emptySequence')}</p>}
      {cues.map((cue, i) => {
        const source = page.elements.find((e) => e.id === cue.elementId);
        return (
          <div className="cue-row" key={(cue.elementId ?? cue.assetId) + cue.kind}>
            <div className="cue-heading">
              <button onClick={() => source && onSelect(source.id)}>
                {cue.kind === 'voice' ? '♫' : '⚡'} {source?.name ?? t('legacyAudio')}
              </button>
              {source && cue.kind === 'voice' && (
                <span>
                  <button
                    aria-label={t('upSpeech') + ' ' + source.name}
                    disabled={
                      !cues
                        .filter((c) => c.kind === 'voice')
                        .slice(0, i)
                        .some((c) => c.elementId)
                    }
                    onClick={() => onChange(reorderDialogue(page, index, source.id, -1))}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    aria-label={t('downSpeech') + ' ' + source.name}
                    disabled={i >= cues.filter((c) => c.kind === 'voice' && c.elementId).length - 1}
                    onClick={() => onChange(reorderDialogue(page, index, source.id, 1))}
                  >
                    <ChevronDown size={13} />
                  </button>
                </span>
              )}
            </div>
            <small>
              {source?.text?.slice(0, 80)} · {assets.find((a) => a.id === cue.assetId)?.name}
            </small>
            {source && (
              <>
                <label>
                  {t('cueVolume')} · {Math.round(cue.volume * 100)}%
                  <input
                    aria-label={t('cueVolume') + ' ' + source.name}
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={cue.volume}
                    onChange={(event) =>
                      onChange(
                        changeElement(page, {
                          ...source,
                          audioVolume: +event.target.value,
                        }),
                      )
                    }
                  />
                </label>
                <label>
                  {t(cue.kind === 'voice' ? 'pauseBefore' : 'delayAudio')} (ms)
                  <input
                    aria-label={
                      t(cue.kind === 'voice' ? 'pauseBefore' : 'delayAudio') +
                      ' ' +
                      source.name +
                      ' (ms)'
                    }
                    type="number"
                    min="0"
                    max="30000"
                    step="50"
                    value={source.audioDelay ?? 0}
                    onChange={(event) =>
                      onChange(
                        changeElement(page, {
                          ...source,
                          audioDelay: Math.max(0, Math.min(30000, +event.target.value)),
                        }),
                      )
                    }
                  />
                </label>
                {cue.kind === 'sfx' && (
                  <label>
                    {t('effectTiming')}
                    <select
                      value={source.sfxTiming ?? 'entry'}
                      onChange={(event) =>
                        onChange(
                          changeElement(page, {
                            ...source,
                            sfxTiming: event.target.value as Element['sfxTiming'],
                          }),
                        )
                      }
                    >
                      {(['entry', 'after-transition', 'after-dialogue'] as const).map((timing) => (
                        <option key={timing} value={timing}>
                          {t(
                            timing === 'entry'
                              ? 'cueEntry'
                              : timing === 'after-transition'
                                ? 'cueAfterTransition'
                                : 'cueAfterDialogue',
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </div>
        );
      })}
      <button disabled={cues.length === 0} onClick={() => onTest()}>
        <Play size={13} />
        {t('testMoment')}
      </button>
    </details>
  );
}
