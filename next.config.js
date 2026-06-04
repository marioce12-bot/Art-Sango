/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/*': [
      './*.html',
      './db.json',
      './firebase-config.js',
      './messaging-service.js',
      './mobile-nav.js',
      './platform-logo.js',
      './sw-register.js',
      './sw.js',
      './*.svg',
      './*.webmanifest',
    ],
  },
};

module.exports = nextConfig;
