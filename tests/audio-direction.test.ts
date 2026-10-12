import { it, expect, vi, afterEach } from 'vitest';
import {
  createProject,
  newElement,
  momentAudioCues,
  readerVisibleIds,
  deleteMoment,
  visibleIds,
  musicVolumeAt,
} from '../src/core';
import { startAudioSequence, type AudioLike } from '../src/audioDirection';
afterEach(() => vi.useRealTimers());
it('keeps repeated files as distinct ordered speech cues, with author volume and timing', () => {
  const p = createProject().chapters[0].pages[0];
  const b1 = { ...newElement('bubble'), voiceId: 'same', audioOrder: 2, audioVolume: 0.4 };
  const b2 = { ...newElement('bubble'), voiceId: 'same', audioOrder: 1, audioDelay: 100 };
  const fx = {
    ...newElement('sfx'),
    sfxId: 'fx',
    sfxTiming: 'after-transition' as const,
    audioVolume: 0.2,
  };
  p.elements.push(b1, b2, fx);
  p.moments[0].show.push(b1.id, b2.id, fx.id);
  const cues = momentAudioCues(p, 0);
  expect(cues.filter((c) => c.kind === 'voice').map((c) => c.elementId)).toEqual([b2.id, b1.id]);
  expect(cues.filter((c) => c.kind === 'voice').map((c) => c.assetId)).toEqual(['same', 'same']);
  expect(cues.find((c) => c.assetId === 'fx')?.delay).toBe(400);
  expect(cues.find((c) => c.elementId === b1.id)?.volume).toBe(0.4);
  expect(momentAudioCues(p, 0, true).find((c) => c.assetId === 'fx')?.delay).toBe(0);
});
it('plays speech sequentially, effects independently, multiplies volume and cancels pending audio on back', () => {
  vi.useFakeTimers();
  const made: ({ id: string } & AudioLike)[] = [];
  const create = (id: string) => {
    const audio = {
      id,
      volume: 1,
      onended: null,
      onerror: null,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    };
    made.push(audio);
    return audio;
  };
  const session = startAudioSequence(
    [
      {
        elementId: 'b1',
        assetId: 'same',
        kind: 'voice',
        volume: 0.5,
        delay: 100,
        afterDialogue: false,
      },
      {
        elementId: 'b2',
        assetId: 'same',
        kind: 'voice',
        volume: 1,
        delay: 50,
        afterDialogue: false,
      },
      {
        elementId: 'fx',
        assetId: 'fx',
        kind: 'sfx',
        volume: 0.25,
        delay: 200,
        afterDialogue: false,
      },
    ],
    create,
    { voice: 0.8, sfx: 0.4 },
  );
  expect(made).toHaveLength(0);
  vi.advanceTimersByTime(100);
  expect(made.map((a) => a.id)).toEqual(['same']);
  expect(made[0].volume).toBe(0.4);
  vi.advanceTimersByTime(100);
  expect(made.map((a) => a.id)).toEqual(['same', 'fx']);
  expect(made[1].volume).toBe(0.1);
  made[0].onended?.();
  vi.advanceTimersByTime(50);
  expect(made.map((a) => a.id)).toEqual(['same', 'fx', 'same']);
  session.setLevels({ voice: 0.2, sfx: 0.6 });
  expect(made[2].volume).toBe(0.2);
  session.stop();
  expect(made[2].pause).toHaveBeenCalled();
  vi.runAllTimers();
  expect(made).toHaveLength(3);
});
it('effects after dialogue wait for speech completion and are cancelled by interruption', () => {
  vi.useFakeTimers();
  const made: AudioLike[] = [];
  const session = startAudioSequence(
    [
      { assetId: 'voice', kind: 'voice', volume: 1, delay: 0, afterDialogue: false },
      { assetId: 'fx', kind: 'sfx', volume: 1, delay: 100, afterDialogue: true },
    ],
    () => {
      const a = {
        volume: 1,
        onended: null,
        onerror: null,
        play: () => Promise.resolve(),
        pause: vi.fn(),
      };
      made.push(a);
      return a;
    },
    { voice: 1, sfx: 1 },
  );
  expect(made).toHaveLength(1);
  made[0].onended?.();
  session.stop();
  vi.runAllTimers();
  expect(made).toHaveLength(1);
});
it('transition-only lettering disappears after transition but is retained with reduced motion', () => {
  const p = createProject().chapters[0].pages[0],
    e = { ...newElement('sfx'), transitionOnly: true };
  p.elements.push(e);
  p.moments[0].show.push(e.id);
  expect(readerVisibleIds(p, 0, true, false).has(e.id)).toBe(true);
  expect(readerVisibleIds(p, 0, false, false).has(e.id)).toBe(false);
  expect(readerVisibleIds(p, 0, false, true).has(e.id)).toBe(true);
});

it('deleting a moment retains its only-revealed content and does not mutate the source', () => {
  const p = createProject().chapters[0].pages[0],
    id = p.elements[1].id;
  const next = deleteMoment(p, 1);
  expect(next.moments).toHaveLength(3);
  expect(visibleIds(next.moments, 0, next.elements).has(id)).toBe(true);
  expect(p.moments).toHaveLength(4);
  expect(deleteMoment({ ...p, moments: [p.moments[0]] }, 0).moments).toHaveLength(1);
});

it('finishing a visual transition early triggers its effect without restarting speech', () => {
  vi.useFakeTimers();
  const played: string[] = [];
  const session = startAudioSequence(
    [
      { assetId: 'voice', kind: 'voice', volume: 1, delay: 0, afterDialogue: false },
      {
        assetId: 'fx',
        kind: 'sfx',
        volume: 1,
        delay: 500,
        transitionDelay: 500,
        afterDialogue: false,
      },
    ],
    (id) => ({
      volume: 1,
      onended: null,
      onerror: null,
      play: () => {
        played.push(id);
        return Promise.resolve();
      },
      pause: () => {},
    }),
    { voice: 1, sfx: 1 },
  );
  expect(played).toEqual(['voice']);
  session.finishTransition();
  expect(played).toEqual(['voice', 'fx']);
  vi.runAllTimers();
  expect(played).toEqual(['voice', 'fx']);
  session.stop();
});

it('a panel can adjust inherited ambience volume without restarting the music', () => {
  const p = createProject().chapters[0].pages[0];
  p.moments[0].musicId = 'music';
  p.moments[0].musicVolume = 0.8;
  p.moments[1].musicVolume = 0.3;
  expect(musicVolumeAt(p.moments, 1)).toBe(0.3);
  expect(musicVolumeAt(p.moments, 2)).toBe(0.3);
});
