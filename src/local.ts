import type { Project } from './core';
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('komori-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function localSave(project: Project) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function localWorks() {
  const database = await db();
  return new Promise<Project[]>((resolve, reject) => {
    const request = database.transaction('drafts').objectStore('drafts').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
