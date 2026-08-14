import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BookMi',
    short_name: 'BookMi',
    description: 'Salon appointment booking — scan, book, done.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2F4F3E',
    icons: [
      {
        src: '/icon-192x192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
