import { audioGain, type AudioCue } from './core';
export type AudioLike = {
  volume: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
};
export function startAudioSequence(
  cues: AudioCue[],
  create: (assetId: string) => AudioLike | undefined,
  initial: { voice: number; sfx: number },
) {
  let active = true,
    levels = initial;
  const timers = new Set<ReturnType<typeof setTimeout>>(),
    tracks = new Map<AudioLike, AudioCue>();
  const pendingTransitions = new Map<AudioCue, ReturnType<typeof setTimeout>>();
  function schedule(fn: () => void, delay: number) {
    if (!active) return;
    if (delay <= 0) {
      fn();
      return;
    }
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (active) fn();
    }, delay);
    timers.add(timer);
    return timer;
  }
  function play(cue: AudioCue, done: () => void = () => {}) {
    if (!active) return;
    const audio = create(cue.assetId);
    if (!audio) {
      done();
      return;
    }
    tracks.set(audio, cue);
    audio.volume = audioGain(levels[cue.kind]) * cue.volume;
    let finished = false;
    const finish = () => {
      if (finished || !active) return;
      finished = true;
      tracks.delete(audio);
      audio.onended = null;
      audio.onerror = null;
      done();
    };
    audio.onended = finish;
    audio.onerror = finish;
    void audio.play().catch(finish);
  }
  const voices = cues.filter((c) => c.kind === 'voice'),
    after = cues.filter((c) => c.kind === 'sfx' && c.afterDialogue);
  let index = 0;
  const next = () => {
    if (!active) return;
    const cue = voices[index++];
    if (!cue) {
      after.forEach((c) => schedule(() => play(c), c.delay));
      return;
    }
    schedule(() => play(cue, next), cue.delay);
  };
  cues
    .filter((c) => c.kind === 'sfx' && !c.afterDialogue)
    .forEach((c) => {
      const timer = schedule(() => {
        pendingTransitions.delete(c);
        play(c);
      }, c.delay);
      if (timer && c.transitionDelay) pendingTransitions.set(c, timer);
    });
  next();
  return {
    finishTransition() {
      if (!active) return;
      const pending = [...pendingTransitions];
      pendingTransitions.clear();
      pending.forEach(([cue, timer]) => {
        clearTimeout(timer);
        timers.delete(timer);
        schedule(() => play(cue), Math.max(0, cue.delay - (cue.transitionDelay ?? 0)));
      });
    },
    stop() {
      active = false;
      timers.forEach(clearTimeout);
      timers.clear();
      pendingTransitions.clear();
      tracks.forEach((_, a) => {
        a.onended = null;
        a.onerror = null;
        a.pause();
      });
      tracks.clear();
    },
    setLevels(nextLevels: { voice: number; sfx: number }) {
      levels = nextLevels;
      tracks.forEach((cue, a) => {
        a.volume = audioGain(levels[cue.kind]) * cue.volume;
      });
    },
  };
}
