/**
 * Helper to normalize and sanitize image URLs from various sources (Postimages, Imgur, Cloudinary, etc.)
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  // 1. If user pasted HTML: <a href="..."><img src="https://i.postimg.cc/..." /></a> or <img src="..." />
  const srcMatch = clean.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    clean = srcMatch[1].trim();
  }

  // 2. If user pasted Markdown: [![alt](https://i.postimg.cc/...)](...) or ![alt](url)
  const mdMatch = clean.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
  if (mdMatch && mdMatch[1]) {
    clean = mdMatch[1].trim();
  }

  // 3. Ensure HTTPS
  if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }

  return clean;
}
