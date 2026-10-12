import { useState } from 'react';
import type { Project } from './core';
export function useHistory(initial: Project) {
  const [history, setHistory] = useState({
    past: [] as Project[],
    present: initial,
    future: [] as Project[],
  });
  function commit(project: Project) {
    setHistory((h) => ({ past: [...h.past.slice(-39), h.present], present: project, future: [] }));
  }
  function undo() {
    setHistory((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future] }
        : h,
    );
  }
  function redo() {
    setHistory((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h,
    );
  }
  return {
    project: history.present,
    commit,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
  };
}
