import { createProject, newElement, uid, type Project } from './core';
export function demoProject(): Project {
  const project = createProject();
  project.id = 'd7154c9f-2ca1-44c6-b36d-a37e8154d170';
  project.title = 'Depois da chuva';
  project.author = 'Estúdio Komori';
  project.description =
    'Um pequeno encontro, quatro quadros e o tempo de uma cidade. Uma demonstração de leitura que se revela.';
  project.assets = ['city', 'train', 'eye', 'night'].map((name, i) => ({
    id: `demo-${i}`,
    name: `${name}.svg`,
    type: 'image',
    mime: 'image/svg+xml',
    size: 0,
    src: `/demo/${name}.svg`,
  }));
  project.coverId = 'demo-0';
  project.assets.push(
    {
      id: 'demo-rain',
      name: 'rain.webm',
      type: 'video',
      mime: 'video/webm',
      size: 0,
      src: '/demo/rain.webm',
    },
    {
      id: 'demo-chime',
      name: 'chime.wav',
      type: 'audio',
      mime: 'audio/wav',
      size: 0,
      src: '/demo/chime.wav',
    },
    {
      id: 'demo-ambience',
      name: 'ambience.wav',
      type: 'audio',
      mime: 'audio/wav',
      size: 0,
      src: '/demo/ambience.wav',
    },
  );
  const page = project.chapters[0].pages[0];
  page.elements.forEach((e, i) => {
    e.assetId = `demo-${i}`;
    e.fill = '#efeade';
  });
  page.elements[0].assetId = 'demo-rain';
  page.elements[0].posterId = 'demo-0';
  page.elements[0].loop = true;
  const bubble = newElement('bubble', 475, 95);
  bubble.width = 245;
  bubble.height = 105;
  bubble.text = 'A cidade ainda está acordada.';
  bubble.fontSize = 22;
  const caption = newElement('text', 75, 790);
  caption.width = 400;
  caption.height = 90;
  caption.text = 'E, pela primeira vez, eu também.';
  caption.fontSize = 23;
  page.elements.push(bubble, caption);
  page.moments[0].show.push(bubble.id);
  page.moments[3].show.push(caption.id);
  page.moments[0].musicId = 'demo-ambience';
  page.moments[2].sfxId = 'demo-chime';
  page.moments.forEach((m, i) => {
    m.label = ['A cidade', 'A espera', 'O encontro', 'Um novo começo'][i];
    m.transition = i === 2 ? 'zoom' : 'fade';
    m.duration = 600;
  });
  project.chapters[0].title = '01 · Depois da chuva';
  return project;
}
