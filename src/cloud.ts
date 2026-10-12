import { createClient } from '@supabase/supabase-js';
import {
  type Project,
  type Asset,
  snapshot,
  uid,
  validateUpload,
  buildPublication,
  normalizeProject,
} from './core';
import { createWriteQueue } from './serial';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;
const writeQueue = createWriteQueue();
export async function saveDraft(project: Project, ownerId: string) {
  if (!cloud) throw new Error('Supabase não configurado / Supabase not configured');
  const copy = snapshot(project);
  copy.assets.forEach((a) => {
    if (a.path) a.src = '';
  });
  await writeQueue(project.id, async () => {
    const { error } = await cloud!.from('works').upsert({
      id: project.id,
      owner_id: ownerId,
      draft: copy,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });
}
export async function resolveAssets(project: Project, syncLinks = true): Promise<Project> {
  const copy = normalizeProject(project, syncLinks);
  if (!cloud) return copy;
  const paths = copy.assets.flatMap((a) => (a.path ? [a.path] : []));
  if (!paths.length) return copy;
  const { data, error } = await cloud.storage.from('media').createSignedUrls(paths, 3600);
  if (error) throw error;
  copy.assets.forEach((a) => {
    if (a.path) a.src = data?.find((s) => s.path === a.path)?.signedUrl ?? '';
  });
  return copy;
}
export async function loadWorks(): Promise<Project[]> {
  if (!cloud) return [];
  const { data, error } = await cloud
    .from('works')
    .select('draft')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => resolveAssets(row.draft as Project)));
}
export async function uploadMedia(file: File, project: Project, ownerId?: string): Promise<Asset> {
  const invalid = validateUpload(file);
  if (invalid) throw new Error(invalid);
  if (project.assets.reduce((sum, a) => sum + a.size, 0) + file.size > 200 * 1024 * 1024)
    throw new Error('Limite por obra: 200 MB / Work limit: 200 MB');
  const id = uid();
  const asset: Asset = {
    id,
    name: file.name,
    mime: file.type,
    size: file.size,
    type: file.type.startsWith('audio')
      ? 'audio'
      : file.type.startsWith('video')
        ? 'video'
        : 'image',
    src: '',
  };
  if (cloud && ownerId) {
    await saveDraft(project, ownerId);
    const extension =
      file.name
        .split('.')
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    asset.path = `${ownerId}/${project.id}/${id}.${extension}`;
    const { error } = await cloud.storage
      .from('media')
      .upload(asset.path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data, error: signError } = await cloud.storage
      .from('media')
      .createSignedUrl(asset.path, 3600);
    if (signError) throw signError;
    asset.src = data.signedUrl;
  } else {
    asset.src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  return asset;
}
export async function publish(
  project: Project,
  ownerId: string,
  chapterId: string,
): Promise<string> {
  if (!cloud) throw new Error('Supabase não configurado / Supabase not configured');
  await saveDraft(project, ownerId);
  const { data: previous, error: readError } = await cloud
    .from('publications')
    .select('snapshot')
    .eq('work_id', project.id)
    .maybeSingle();
  if (readError) throw readError;
  const copy = buildPublication(project, chapterId, previous?.snapshot as Project | undefined);
  if (copy.assets.some((a) => !a.path && !a.src.startsWith('/demo/')))
    throw new Error('Importe os arquivos novamente com sua conta / Reimport files while signed in');
  const paths = copy.assets
    .filter((a) => a.path)
    .map((a) => ({ work_id: project.id, owner_id: ownerId, path: a.path }));
  if (paths.length) {
    const { error } = await cloud
      .from('published_assets')
      .upsert(paths, { onConflict: 'path', ignoreDuplicates: true });
    if (error) throw error;
  }
  copy.assets.forEach((a) => {
    if (a.path) a.src = '';
  });
  const { error } = await cloud.from('publications').upsert({
    work_id: project.id,
    owner_id: ownerId,
    snapshot: copy,
    published_at: new Date().toISOString(),
  });
  if (error) throw error;
  return `${location.origin}/m/${project.id}`;
}
export async function loadPublished(id: string): Promise<Project> {
  if (!cloud) throw new Error('Supabase não configurado / Supabase not configured');
  const { data, error } = await cloud
    .from('publications')
    .select('snapshot')
    .eq('work_id', id)
    .single();
  if (error) throw error;
  return resolveAssets(data.snapshot as Project, false);
}
export async function deleteWork(id: string, ownerId: string): Promise<{ cleanupFailed: boolean }> {
  if (!cloud) throw new Error('Supabase não configurado / Supabase not configured');
  return writeQueue(id, async () => {
    const prefix = `${ownerId}/${id}`;
    const paths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await cloud!.storage
        .from('media')
        .list(prefix, { limit: 100, offset });
      if (error) throw error;
      paths.push(...data.filter((file) => file.id).map((file) => `${prefix}/${file.name}`));
      if (data.length < 100) break;
    }
    const { error } = await cloud!
      .from('works')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('id')
      .single();
    if (error) throw error;
    // Foreign keys remove publication and published-asset rows before media cleanup.
    for (let i = 0; i < paths.length; i += 100) {
      const { error: cleanupError } = await cloud!.storage
        .from('media')
        .remove(paths.slice(i, i + 100));
      if (cleanupError) return { cleanupFailed: true };
    }
    return { cleanupFailed: false };
  });
}
