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
    colors: {
      primary: '#347be8',
    },
    bg_image: {
      enable: true,
      url: '/yomosugara-notes/images/night-cg-background.webp',
      dark: '/yomosugara-notes/images/night-cg-background.webp',
      opacity: 0.28,
    },
    valaxyDarkOptions: {
      circleTransition: false,
    },
    fireworks: {
      enable: false,
    },
    say: {
      enable: false,
      api: '',
      hitokoto: {
        enable: false,
        api: '',
      },
    },
    nav: [
      { text: '文章', link: '/posts/', icon: 'i-ri-article-line' },
      { text: '归档', link: '/archives/', icon: 'i-ri-archive-line' },
      { text: '关于', link: '/about/', icon: 'i-ri-user-line' },
    ],
    banner: {
      enable: false,
    },
    pages: [],
    sponsor: {
      enable: false,
    },
    footer: {
      since: 2026,
      icon: {
        enable: false,
      },
    },
  },
})
