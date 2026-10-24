import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://komarichikaa.github.io/my-notes/',
  lang: 'zh-CN',
  timezone: 'Asia/Shanghai',
  title: 'my-notes',
  author: {
    name: 'Guraぐら',
    avatar: 'https://komarichikaa.github.io/my-notes/images/author-avatar.webp',
  },
  description: '关于 MAD、分镜、Storybrew 与制作过程的记录。',
  social: [
    {
      name: 'GitHub',
      link: 'https://github.com/komariChikaA',
      icon: 'i-ri-github-line',
    },
  ],
  search: {
    enable: false,
  },
})
