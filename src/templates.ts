import { cloud } from './cloud';
import type { ElementTemplate } from './core';
const localKey = 'komori-element-templates-v1';
export async function loadElementTemplates(ownerId?: string): Promise<ElementTemplate[]> {
  if (cloud && ownerId) {
    const { data, error } = await cloud
      .from('element_templates')
      .select('definition')
      .eq('owner_id', ownerId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((row) => row.definition as ElementTemplate);
  }
  try {
    return JSON.parse(localStorage.getItem(localKey) ?? '[]');
  } catch {
    return [];
  }
}
export async function saveElementTemplate(template: ElementTemplate, ownerId?: string) {
  if (cloud && ownerId) {
    const { error } = await cloud
      .from('element_templates')
      .upsert({ id: template.id, owner_id: ownerId, definition: template });
    if (error) throw error;
    return;
  }
  const templates = await loadElementTemplates();
  localStorage.setItem(
    localKey,
    JSON.stringify([...templates.filter((t) => t.id !== template.id), template]),
  );
}
export async function removeElementTemplate(id: string, ownerId?: string) {
  if (cloud && ownerId) {
    const { error } = await cloud
      .from('element_templates')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) throw error;
    return;
  }
  const templates = await loadElementTemplates();
  localStorage.setItem(localKey, JSON.stringify(templates.filter((t) => t.id !== id)));
}
