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

### 本地写作台

双击仓库里的 **打开写作台.cmd**，会启动后台服务并打开浏览器。也可在终端执行：

```sh
pnpm writer
```

默认地址为 <http://127.0.0.1:4317>，仅在本机监听，不依赖云端写作服务。

- 左栏选择或新建文章，中间编辑 Markdown，支持写作、分屏和正文预览。输入后自动保存，也可按 `Ctrl+S`。
- “文章信息”可改标题、日期、标签和分类，新建文章默认是草稿。草稿在正式构建时不发布。
- 图片素材库可复用现有图片，也可上传、拖入或粘贴图片到正文，文件保存在 `public/images/uploads/`。
- 在正文中选中文字，右栏会记录小节和行号。右栏支持只提问、修改当前文章、寻找整理图片、生成配图四种任务。
- 助手调用本机 `codex exec`，沿用 Codex CLI 的登录和模型配置。只提问使用只读模式；修改和素材任务可写入仓库，不会自行提交、推送或发布。
- “复制给 Codex”会带上文章路径、当前小节、选区和问题，可以粘贴到当前 Codex 聊天继续处理，尤其适合调用聊天中的图像工具。若 CLI 会话不支持图片生成，它会给出明确说明和可复用的提示词。

写作台会保存 `.writer/context.json`，所以在 Codex 里说“看看我选中的这段”时，Agent 可读取这个文件定位内容。对话、任务和上一个保存版本的备份也在 `.writer/`，不进入 Git 或公开博客。若 Agent 与编辑器同时改了同一文件，界面会保留当前输入，并提供载入磁盘版本或另存草稿的选择。

写作台的预览用于边写边看正文排版；完整站点外观继续使用 `pnpm dev`。保存为本地草稿与发布是两个动作，准备好后再提交并推送到 `main`。

### 直接编辑文件

在 `pages/posts/` 新建 Markdown 文件，图片放到 `public/images/`，在 frontmatter 里写标题、日期、分类和标签。正文图片使用相对站点根路径，例如 `/images/storyboards/title-01.webp`。

## 部署

推送到 `main` 会触发 `.github/workflows/gh-pages.yml`，构建后发布到 GitHub Pages。GitHub 仓库的 Pages 来源需要设置为 **GitHub Actions**。

项目站点使用 `/my-notes/` 作为 Vite base path。

## 图片说明

- `public/images/storyboards/` 是本博客所写 MAD 的分镜联系图与当前预览。
- 文章中的参考作品缩略图来自哔哩哔哩公开视频封面，均链接回原视频，并标出作品和作者/转载信息。

博客以静态 HTML、CSS 和构建生成的页面为主；没有评论、搜索或统计插件，联系图使用 WebP 并由浏览器延迟加载。
