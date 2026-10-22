const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
