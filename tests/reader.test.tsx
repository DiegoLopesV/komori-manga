import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Reader } from '../src/Reader';
import { createProject } from '../src/core';
afterEach(cleanup);
it('requires an adult warning before showing any cover or page', () => {
  const project = createProject();
  project.adult = true;
  project.title = 'Hidden adult title';
  render(<Reader project={project} language="pt-BR" onClose={vi.fn()} />);
  expect(screen.queryByText('Hidden adult title')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tenho 18 anos ou mais' }));
  expect(screen.getByText('Hidden adult title')).toBeInTheDocument();
});
it('navigates with buttons and restores progress', () => {
  render(<Reader project={createProject()} language="pt-BR" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
  expect(screen.getByText('2 / 4')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
});
it('plays the opening voice only after interaction and never replays on back', () => {
  const play = vi.fn().mockResolvedValue(undefined),
    pause = vi.fn();
  vi.stubGlobal(
    'Audio',
    class {
      volume = 1;
      loop = false;
      play = play;
      pause = pause;
    },
  );
  const project = createProject();
  project.assets.push({
    id: 'voice',
    name: 'voice',
    type: 'audio',
    mime: 'audio/wav',
    size: 100,
    src: 'voice.wav',
  });
  project.chapters[0].pages[0].moments[0].voiceId = 'voice';
  render(<Reader project={project} language="pt-BR" onClose={vi.fn()} />);
  expect(play).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
  expect(play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ouvir novamente' }));
  expect(play).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});
