/** Build a website callback URL for Supabase email authentication flows. */
export function getSitePageUrl(page: 'confirmed' | 'reset-password'): string {
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (!siteUrl) {
    throw new Error('Set EXPO_PUBLIC_SITE_URL to the deployed website URL and rebuild the app.');
  }
  return `${siteUrl}/${page}`;
}
