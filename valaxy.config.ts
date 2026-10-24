import type { UserThemeConfig } from 'valaxy-theme-yun'
import { defineValaxyConfig } from 'valaxy'

export default defineValaxyConfig<UserThemeConfig>({
  theme: 'yun',
  siteConfig: {
    url: 'https://komarichikaa.github.io/yomosugara-notes/',
  },
  vite: {
    base: '/yomosugara-notes/',
  },
  themeConfig: {
    banner: {
      enable: false,
    },
    pages: [],
    sponsor: {
      enable: false,
    },
    footer: {
      since: 2026,
    },
  },
})
