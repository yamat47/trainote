import type { StorybookConfig } from '@storybook/react-vite';

// Storybook renders design/src, the design system's source. It has its own Vite config
// because the app's one starts the Cloudflare Worker, which a story never needs.
const config: StorybookConfig = {
  stories: ['../design/src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  // The container binds 0.0.0.0; only the host's browser may reach it.
  core: { disableTelemetry: true, allowedHosts: ['localhost', '127.0.0.1'] },
};

export default config;
