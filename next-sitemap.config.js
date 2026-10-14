/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://bookmi.sablemesa.in',
  generateRobotsTxt: true,
  generateIndexSitemap: false, // Generates a single sitemap.xml instead of sitemap.xml + sitemap-0.xml
  sitemapSize: 7000,
  exclude: [
    // Next.js internal / app assets
    '/icon.png',
    '/manifest.webmanifest',
    // Excluded per user requirements
    '/cookies',
    '/cookies/*',
    '/onboarding',
    '/onboarding/*',
    '/sign-in',
    '/sign-in/*',
    '/sign-up',
    '/sign-up/*',
    // API routes
    '/api/*',
    // Dynamic tenant owner / customer authenticated routes
    '/[slug]/*',
  ],
  // The root path '/' is a dynamic server route in Next.js App Router (due to Clerk auth),
  // so it is not listed in prerender-manifest.json. We explicitly include it here.
  additionalPaths: async (config) => {
    return [
      await config.transform(config, '/'),
    ];
  },
  transform: async (config, path) => {
    // Custom priority and changefreq based on marketing page importance
    let priority = 0.7;
    let changefreq = 'weekly';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/features' || path === '/pricing' || path === '/pilot') {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/legal/')) {
      priority = 0.3;
      changefreq = 'monthly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cookies',
          '/onboarding',
          '/sign-in',
          '/sign-up',
          '/*/dashboard',
          '/*/appointments',
          '/*/calendar',
          '/*/clients',
          '/*/settings',
          '/*/history',
        ],
      },
    ],
  },
};
