export const IMAGE_SIZES = {
  mini: 200,
  thumb: 400,
  medium: 900,
  large: 1600,
} as const;

// Dominio propio de tu bucket R2 (el mismo donde está la zona de Cloudflare)
const CDN_ORIGIN = 'https://img.tudominio.com';

export function cfImage(url: string | null | undefined, width: number): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.origin !== CDN_ORIGIN) return url;             // no es de tu dominio: no se transforma
    if (u.pathname.startsWith('/cdn-cgi/')) return url;  // ya viene transformada
    return `${CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=80,format=auto,onerror=redirect${u.pathname}`;
  } catch {
    return url;
  }
}