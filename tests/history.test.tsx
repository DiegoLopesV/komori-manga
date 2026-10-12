import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useHistory } from '../src/useHistory';
import { createProject } from '../src/core';
it('undo and redo preserve content and a new edit clears the redo branch', () => {
  const initial = createProject();
  const { result } = renderHook(() => useHistory(initial));
  act(() => result.current.commit({ ...initial, title: 'One' }));
  act(() => result.current.undo());
  expect(result.current.project.title).toBe(initial.title);
  act(() => result.current.redo());
  expect(result.current.project.title).toBe('One');
  act(() => result.current.undo());
  act(() => result.current.commit({ ...initial, title: 'Two' }));
  expect(result.current.canRedo).toBe(false);
});
