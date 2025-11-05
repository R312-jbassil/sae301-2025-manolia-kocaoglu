import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  integrations: [tailwind({ applyBaseStyles: false })],
  adapter: node({ mode: 'standalone' })
});