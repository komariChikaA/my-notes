# Blog writing workspace

- Work in this repository (`my-notes`). Published posts live in `pages/posts/`; reusable images live in `public/images/`.
- If the user refers to "this paragraph", "current section", or a writing sidebar selection, read `.writer/context.json` when present, then read the referenced article. This file is live local UI context; use the user's explicit message when they differ.
- Read `.writer/tasks/` for the current article's local writing assistant conversation when continuity is needed. These files are local and ignored by Git.
- Keep personal experiences and feelings as editable drafts unless supplied by the user. Preserve image provenance and reference links.
- The local writing UI is in `tools/writer/`. Do not put its backend, task history, backups, or conversations into the public website.
- Editing or saving a draft does not authorize publishing it. Push or deploy only when the user requests publication.
- GitHub Issues hold persistent implementation tasks and checkpoints. Resume related tasks first. Use `WIP` during implementation and `Qualified` when implementation and necessary checks are complete; leave formal acceptance and `Ranked` to the user.
