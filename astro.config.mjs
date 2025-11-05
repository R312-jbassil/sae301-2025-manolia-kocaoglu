// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config

export default defineConfig({
    output: 'server',
    integrations: [tailwind({
      applyBaseStyles: false, // On gère tout dans global.css
    })]
  });
