import { defineConfig } from 'astro/config';

// GitHub Pages에 올리면 주소가 /저장소이름/ 아래에 생긴다. 배포 워크플로가 BASE_PATH를 넘겨준다.
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
});
