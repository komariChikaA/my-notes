# my-notes

一个以 MAD、分镜与 Storybrew 制作为主题的轻量静态博客。文章以 Markdown 维护，Valaxy 负责静态生成，部署到 GitHub Pages。

## 本地预览

需要 Node.js 22.12 或更新版本，以及 pnpm 9。

```sh
pnpm install
pnpm dev
```

构建静态页面：

```sh
pnpm build
pnpm serve
```

## 写文章

在 `pages/posts/` 新建 Markdown 文件，图片放到 `public/images/`，在 frontmatter 里写标题、日期、分类和标签。正文图片使用相对站点根路径，例如 `/images/storyboards/title-01.webp`。

## 部署

推送到 `main` 会触发 `.github/workflows/gh-pages.yml`，构建后发布到 GitHub Pages。GitHub 仓库的 Pages 来源需要设置为 **GitHub Actions**。

项目站点使用 `/my-notes/` 作为 Vite base path。

## 图片说明

- `public/images/storyboards/` 是本博客所写 MAD 的分镜联系图与当前预览。
- 文章中的参考作品缩略图来自哔哩哔哩公开视频封面，均链接回原视频，并标出作品和作者/转载信息。

博客以静态 HTML、CSS 和构建生成的页面为主；没有评论、搜索或统计插件，联系图使用 WebP 并由浏览器延迟加载。
