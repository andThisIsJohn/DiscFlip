/**
 * Self-contained placeholder images (SVG data URIs), so avatars, club logos and
 * sample disc photos render without calling third-party image services.
 */

const PALETTE = [
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#be123c',
  '#c2410c',
  '#15803d',
  '#0369a1',
  '#a16207',
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Round avatar with the person's initials on a color picked from their name. */
export function avatarUrl(seed: string = 'DiscFlip'): string {
  const clean = seed.replace(/[^A-Za-z0-9 ]/g, ' ').trim() || 'DF';
  const parts = clean.split(/\s+|(?=[A-Z][a-z])/).filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase();
  const bg = PALETTE[hash(seed) % PALETTE.length];
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="41" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`
  );
}

/** Top-down drawing of a disc golf disc, used when a listing has no photo. */
export function discArtUrl(color: string = '#2563eb', rim: string = '#ffffff', label = ''): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e2e8f0"/><circle cx="300" cy="300" r="250" fill="${rim}"/><circle cx="300" cy="300" r="225" fill="${color}"/><circle cx="300" cy="300" r="150" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="6"/><text x="300" y="315" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="800" fill="#ffffff" fill-opacity=".85" text-anchor="middle">${label}</text></svg>`
  );
}
