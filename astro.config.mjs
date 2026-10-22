import { defineConfig } from 'astro/config';

// 운영은 Vercel(https://mjms-news.vercel.app). 하위 경로에 올릴 때만 BASE_PATH를 넘긴다.
export default defineConfig({
  site: process.env.SITE_URL || 'https://mjms-news.vercel.app',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
});
