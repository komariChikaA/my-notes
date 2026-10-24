const $ = id => document.getElementById(id)
const state = { post: null, posts: [], assets: [], dirty: false, conflict: false, saving: null, context: {}, history: [], taskId: null, polling: false, root: '', dark: false, previewVersion: 0 }
let saveTimer, previewTimer, contextTimer, toastTimer
const modeNames = { ask: '提问', edit: '修改正文', images: '寻找 / 整理图片', generate: '生成配图' }
const help = { ask: '结合当前文章和选区给建议，不修改文件。', edit: '助手会直接修改当前文章，完成后载入磁盘结果。', images: '助手可搜索来源或整理本地素材，图片保存到素材库。可在问题中附上素材路径。', generate: '调用当前 Agent 可用的图像工具。若 CLI 不支持，请用“复制给 Codex”发到本次聊天。' }

async function api(url, options = {}) {
  const headers = { 'x-writer-request': '1', ...options.headers }
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof File)) {
    options = { ...options, body: JSON.stringify(options.body) }
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(url, { ...options, headers })
  const result = await response.json()
  if (!response.ok) { const error = new Error(result.error || '请求失败'); error.status = response.status; throw error }
  return result
}

function toast(message) {
  $('toast').textContent = message
  $('toast').hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { $('toast').hidden = true }, 4500)
}

function values() {
  return {
    body: $('editor').value,
    metadata: {
      title: $('post-title').value,
      date: $('post-date').value,
      tags: $('post-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      categories: $('post-categories').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      draft: $('post-draft').checked,
    },
  }
}

function bufferKey(file = state.post?.path) { return `my-notes-writer:${file}` }
function remember() {
  if (!state.post) return
  try { localStorage.setItem(bufferKey(), JSON.stringify({ ...values(), revision: state.post.revision, updated: Date.now() })) }
  catch { $('save-status').textContent = '浏览器缓存不可用，请及时保存到文件。' }
}

function showConflict(message) {
  state.conflict = true
  $('conflict-banner').hidden = false
  $('conflict-text').textContent = message
  $('save-status').textContent = '需要处理文件版本差异 · 当前输入已保留'
}

function setFields(post) {
  $('post-title').value = post.metadata.title
  $('post-date').value = post.metadata.date
  $('post-tags').value = post.metadata.tags.join(', ')
  $('post-categories').value = post.metadata.categories.join(', ')
  $('post-draft').checked = post.metadata.draft
  $('editor').value = post.body
  $('editor').setSelectionRange(0, 0)
  $('editor').scrollTop = 0
  $('file-path').textContent = post.path
  $('save-status').textContent = '已保存到本地 Markdown'
  state.dirty = false
  state.conflict = false
  state.context = {}
  $('conflict-banner').hidden = true
  updateContext()
  schedulePreview()
  countWords()
}

function countWords() {
  const text = $('editor').value
  $('word-count').textContent = `${text.replace(/\s/g, '').length.toLocaleString()} 字符 · ${text.split('\n').length} 行`
}

function changed() {
  if (!state.post) return
  state.dirty = true
  remember()
  countWords()
  schedulePreview()
  $('save-status').textContent = state.conflict ? '版本有差异，当前输入已缓存' : '正在等待保存…'
  clearTimeout(saveTimer)
  if (!state.conflict) saveTimer = setTimeout(() => save().catch(() => {}), 1400)
}

async function save() {
  clearTimeout(saveTimer)
  if (!state.post || !state.dirty) return
  if (state.conflict) throw new Error('请先处理磁盘版本差异。')
  if (state.saving) { await state.saving; return save() }
  const file = state.post.path
  const snapshot = values()
  const payload = { path: file, revision: state.post.revision, ...snapshot }
  $('save-status').textContent = '正在保存…'
  state.saving = api('/api/post', { method: 'PUT', body: payload })
  try {
    const post = await state.saving
    if (state.post?.path !== file) return
    state.post.revision = post.revision
    state.dirty = JSON.stringify(values()) !== JSON.stringify(snapshot)
    if (!state.dirty) {
      localStorage.removeItem(bufferKey())
      $('save-status').textContent = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    }
    else { remember(); saveTimer = setTimeout(() => save().catch(() => {}), 800) }
    const index = state.posts.findIndex(p => p.path === file)
    if (index !== -1) Object.assign(state.posts[index], post.metadata)
    renderPosts()
  }
  catch (error) {
    if (error.status === 409) showConflict(error.message)
    else { $('save-status').textContent = '保存失败 · 输入仍保留在浏览器'; toast(error.message) }
    throw error
  }
  finally { state.saving = null }
}

async function loadPost(file, discard = false) {
  if (state.post && state.dirty && !discard) await save()
  const post = await api(`/api/post?path=${encodeURIComponent(file)}`)
  state.post = post
  document.body.classList.remove('show-articles')
  setFields(post)
  localStorage.setItem('writer:last-post', file)
  if (!discard) {
    let buffer
    try { buffer = JSON.parse(localStorage.getItem(bufferKey())) } catch { /* No recoverable buffer. */ }
    if (buffer && JSON.stringify({ body: buffer.body, metadata: buffer.metadata }) !== JSON.stringify(values())) {
      setFields({ ...post, body: buffer.body, metadata: buffer.metadata })
      state.dirty = true
      if (buffer.revision === post.revision) {
        $('save-status').textContent = '已恢复浏览器中尚未保存的内容'
        saveTimer = setTimeout(() => save().catch(() => {}), 1500)
      }
      else showConflict('已恢复上次未保存的输入，但磁盘文件后来发生过变化。可以载入磁盘版本，或把当前内容另存为新草稿。')
    }
  }
  else localStorage.removeItem(bufferKey())
  renderPosts()
  await loadHistory()
}

function renderPosts() {
  const query = $('article-search').value.trim().toLowerCase()
  $('article-list').replaceChildren()
  for (const post of state.posts.filter(p => `${p.title} ${p.path}`.toLowerCase().includes(query))) {
    const button = document.createElement('button')
    button.className = `article-item${post.path === state.post?.path ? ' active' : ''}`
    button.setAttribute('aria-current', post.path === state.post?.path ? 'page' : 'false')
    const title = document.createElement('strong')
    title.textContent = post.title || post.path
    const detail = document.createElement('small')
    detail.textContent = `${post.draft ? '草稿 · ' : ''}${post.date || '未设日期'}`
    button.append(title, detail)
    button.addEventListener('click', () => loadPost(post.path).catch(e => toast(e.message)))
    $('article-list').append(button)
  }
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(async () => {
    const version = ++state.previewVersion
    try {
      const result = await api('/api/preview', { method: 'POST', body: { body: $('editor').value, title: $('post-title').value, dark: state.dark } })
      if (version === state.previewVersion) $('preview').srcdoc = result.html
    }
    catch (error) { toast(`预览失败：${error.message}`) }
  }, 280)
}

function updateContext() {
  if (!state.post) return
  const editor = $('editor')
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const before = editor.value.slice(0, start)
  const headings = [...before.matchAll(/^#{1,6}\s+(.+)$/gm)]
  state.context = { path: state.post.path, heading: headings.at(-1)?.[1] || '全文 / 开篇', startLine: before.split('\n').length, endLine: editor.value.slice(0, end).split('\n').length, selection: editor.value.slice(start, end) }
  $('context-heading').textContent = state.context.heading
  $('context-selection').textContent = state.context.selection || '在正文中选中文字，可只讨论这一段。'
  $('clear-selection').hidden = !state.context.selection
  $('context-lines').textContent = state.context.startLine === state.context.endLine ? `正文第 ${state.context.startLine} 行` : `正文 ${state.context.startLine}–${state.context.endLine} 行`
  clearTimeout(contextTimer)
  contextTimer = setTimeout(() => api('/api/context', { method: 'PUT', body: state.context }).catch(() => {}), 250)
}

function contextPrompt(withQuestion = true) {
  const c = state.context
  return [
    `请协助我编辑本地博客。仓库：${state.root}`,
    `当前文章：${state.post?.path}\n标题：${$('post-title').value}\n当前小节：${c.heading || '全文'}\n正文行号：${c.startLine || 1}–${c.endLine || 1}`,
    c.selection ? `我选中的原文：\n<selection>\n${c.selection}\n</selection>` : '未选中文字，请先读取当前文章。',
    withQuestion ? `操作：${modeNames[$('agent-mode').value]}\n需求：${$('agent-question').value.trim() || '请先帮我看看这部分可以怎样完善。'}` : '请结合当前文章、当前小节与选区理解我接下来的问题。',
    '只处理我提出的内容需求，修改保存到此仓库；图片放到 public/images 并保留来源。不要自行推送或发布。',
  ].join('\n\n')
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('已复制，可粘贴到当前 Codex 聊天。') }
  catch { toast('复制失败，请允许此本地页面访问剪贴板。') }
}

function appendTextLinks(element, text) {
  const pattern = /https?:\/\/[^\s<>\])]+/g
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    element.append(document.createTextNode(text.slice(offset, match.index)))
    const a = document.createElement('a')
    a.href = match[0]; a.textContent = match[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'
    element.append(a)
    offset = match.index + match[0].length
  }
  element.append(document.createTextNode(text.slice(offset)))
}

function renderHistory() {
  const container = $('chat-history')
  if (!state.history.length) return
  container.replaceChildren()
  function message(role, label, text, isError = false) {
    const box = document.createElement('div')
    box.className = `chat-message ${role}`
    const tag = document.createElement('div'); tag.className = 'message-label'; tag.textContent = label
    const content = document.createElement('div'); content.className = `message-text${isError ? ' message-error' : ''}`
    appendTextLinks(content, text)
    box.append(tag, content)
    if (role === 'assistant') { const b = document.createElement('button'); b.className = 'text-button message-copy'; b.textContent = '复制回复'; b.onclick = () => copy(text); box.append(b) }
    container.append(box)
  }
  for (const task of state.history) {
    message('user', `我 · ${modeNames[task.mode]}`, task.question)
    if (task.answer) message('assistant', '写作助手', task.answer)
    if (task.error) message('assistant', task.status === 'interrupted' ? '任务中断' : '任务提示', task.error, true)
    else if (task.status === 'canceled') message('assistant', '已停止', '任务已停止，已发生的文件改动仍保留在本地。')
  }
  container.scrollTop = container.scrollHeight
}

async function loadHistory() {
  state.history = await api(`/api/agent/history?path=${encodeURIComponent(state.post.path)}`)
  if (!state.history.length) $('chat-history').innerHTML = '<div class="chat-empty"><span>从一段话开始</span><p>讨论结构与表达，或让助手修改正文、寻找图片和整理参考。</p></div>'
  else renderHistory()
  const running = state.history.find(t => t.status === 'running')
  if (running) { state.taskId = running.id; pollTask() }
}

async function refreshDiskAfterTask(task) {
  state.posts = await api('/api/posts'); renderPosts()
  await loadAssets()
  if (state.post?.path !== task.path) return
  const disk = await api(`/api/post?path=${encodeURIComponent(task.path)}`)
  if (disk.revision !== state.post.revision) {
    if (state.dirty) showConflict('Agent 已更新磁盘文章。你在运行期间还有新输入，可以载入 Agent 结果，或将当前输入另存草稿。')
    else { state.post = disk; setFields(disk); toast('已载入 Agent 保存的文章改动。') }
  }
}

async function pollTask() {
  if (state.polling || !state.taskId) return
  state.polling = true
  $('task-progress').hidden = false
  $('send-button').disabled = true
  try {
    while (state.taskId) {
      const task = await api(`/api/agent/tasks/${state.taskId}`)
      $('task-status').textContent = task.progress || '助手正在处理…'
      if (task.path === state.post?.path) {
        const index = state.history.findIndex(t => t.id === task.id)
        const old = index === -1 ? null : state.history[index]
        if (index === -1) state.history.push(task)
        else state.history[index] = task
        if (!old || old.answer !== task.answer || old.status !== task.status) renderHistory()
      }
      if (task.status !== 'running') {
        state.taskId = null
        await refreshDiskAfterTask(task)
        if (task.status === 'completed') toast('助手已完成，请查看回复和文章改动。')
        break
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
  }
  catch (error) { toast(`任务连接中断：${error.message}。刷新页面可继续查看状态。`) }
  finally { state.polling = false; $('task-progress').hidden = true; $('send-button').disabled = false }
}

async function sendQuestion(event) {
  event.preventDefault()
  if (!state.post) return toast('请先新建或选择一篇文章。')
  const question = $('agent-question').value.trim()
  if (!question) return toast('先写下你想问的问题。')
  $('send-button').disabled = true
  try {
    await save()
    const task = await api('/api/agent/tasks', { method: 'POST', body: { path: state.post.path, question, mode: $('agent-mode').value, context: state.context } })
    state.history.push(task)
    state.taskId = task.id
    $('agent-question').value = ''
    renderHistory()
    pollTask()
  }
  catch (error) { toast(error.message); $('send-button').disabled = false }
}

function insert(text, replaceSelection = true) {
  const editor = $('editor')
  const start = replaceSelection ? editor.selectionStart : editor.selectionEnd
  const end = editor.selectionEnd
  editor.focus()
  editor.setRangeText(text, start, end, 'end')
  changed(); updateContext()
}

function format(kind) {
  const editor = $('editor'), selection = editor.value.slice(editor.selectionStart, editor.selectionEnd)
  const formats = { heading: `\n## ${selection || '新的小节'}\n\n`, bold: `**${selection || '重点内容'}**`, quote: `\n> ${(selection || '引用内容').replace(/\n/g, '\n> ')}\n`, link: `[${selection || '链接文字'}](https://)` }
  if (kind === 'code') return insert(`\n${'```'}\n${selection || '代码'}\n${'```'}\n`)
  insert(formats[kind] || '')
}

async function loadAssets() {
  state.assets = await api('/api/assets')
  $('asset-count').textContent = `${state.assets.length} 张`
  if ($('asset-dialog').open) renderAssets()
}

function renderAssets() {
  const query = $('asset-search').value.toLowerCase()
  $('asset-grid').replaceChildren()
  for (const asset of state.assets.filter(a => a.url.toLowerCase().includes(query))) {
    const card = document.createElement('article'); card.className = 'asset-card'
    const image = document.createElement('img'); image.src = asset.url; image.alt = asset.name; image.loading = 'lazy'
    const title = document.createElement('p'); title.textContent = asset.name; title.title = asset.url
    const info = document.createElement('small'); info.textContent = `${Math.max(1, Math.round(asset.size / 1024))} KB · ${asset.url.split('/').slice(2, -1).join('/') || '根目录'}`
    const controls = document.createElement('div')
    const add = document.createElement('button'); add.textContent = '插入正文'; add.onclick = () => { insert(`\n![${asset.name.replace(/\.[^.]+$/, '')}](${encodeURI(asset.url)})\n`, false); $('asset-dialog').close() }
    const link = document.createElement('button'); link.textContent = '复制路径'; link.onclick = () => copy(asset.url)
    controls.append(add, link); card.append(image, title, info, controls); $('asset-grid').append(card)
  }
}

async function upload(files, insertNow = false) {
  if (!files.length) return
  try {
    for (const file of files) {
      const asset = await api(`/api/assets?name=${encodeURIComponent(file.name || 'clipboard.png')}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } })
      if (insertNow) insert(`\n![待补充图片说明](${encodeURI(asset.url)})\n`, false)
    }
    await loadAssets()
    toast(`已上传 ${files.length} 张图片${insertNow ? '并插入正文' : ''}。`)
  }
  catch (error) { toast(error.message) }
}

function openLibrary() { renderAssets(); $('asset-dialog').showModal() }

function newDialog() {
  $('new-title').value = ''
  $('new-slug').value = `note-${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })}-${Date.now().toString().slice(-5)}`
  $('new-error').textContent = ''
  $('new-dialog').showModal()
  $('new-title').focus()
}

async function createPost(event) {
  event.preventDefault()
  try {
    await save()
    const post = await api('/api/posts', { method: 'POST', body: { title: $('new-title').value, slug: $('new-slug').value } })
    $('new-dialog').close()
    state.posts = await api('/api/posts')
    await loadPost(post.path)
    $('editor').focus()
  }
  catch (error) { $('new-error').textContent = error.message }
}

async function recoverCopy() {
  try {
    const current = values()
    const base = state.post.path.split('/').at(-1).replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'note'
    const post = await api('/api/posts', { method: 'POST', body: { slug: `${base}-recovery-${Date.now()}`, title: `${current.metadata.title}（恢复草稿）`, body: current.body } })
    localStorage.removeItem(bufferKey())
    state.dirty = false
    state.posts = await api('/api/posts')
    await loadPost(post.path, true)
    toast('当前输入已另存为新的草稿。')
  }
  catch (error) { toast(error.message) }
}

function setTheme(dark) {
  state.dark = dark
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('writer:theme', dark ? 'dark' : 'light')
  $('theme-button').textContent = dark ? '浅色界面' : '深色界面'
  schedulePreview()
}

async function connection() {
  const status = await api('/api/status')
  state.root = status.root
  $('repo-path').textContent = status.root
  $('agent-connection').textContent = status.codex.message
  $('agent-connection').classList.toggle('connected', status.codex.loggedIn)
  if (status.activeTask && !state.taskId) { state.taskId = status.activeTask; pollTask() }
}

$('save-button').onclick = () => save().then(() => toast('已保存到本地。')).catch(e => toast(e.message))
$('theme-button').onclick = () => setTheme(!state.dark)
$('new-button').onclick = newDialog
$('articles-button').onclick = () => document.body.classList.toggle('show-articles')
$('new-form').onsubmit = createPost
$('library-button').onclick = openLibrary
$('insert-image-button').onclick = openLibrary
$('asset-search').oninput = renderAssets
$('article-search').oninput = renderPosts
$('asset-upload').onchange = event => { upload([...event.target.files]); event.target.value = '' }
$('agent-form').onsubmit = sendQuestion
$('agent-mode').onchange = () => { $('mode-help').textContent = help[$('agent-mode').value] }
$('copy-question-button').onclick = () => copy(contextPrompt(true))
$('copy-context-button').onclick = () => copy(contextPrompt(false))
$('refresh-connection').onclick = () => connection().catch(e => toast(e.message))
$('clear-selection').onclick = () => { $('editor').setSelectionRange($('editor').selectionEnd, $('editor').selectionEnd); updateContext() }
$('reload-button').onclick = () => { if (state.post) loadPost(state.post.path, true).catch(e => toast(e.message)) }
$('recover-button').onclick = recoverCopy
$('cancel-task-button').onclick = async () => { if (state.taskId) { try { await api(`/api/agent/tasks/${state.taskId}/cancel`, { method: 'POST' }) } catch (e) { toast(e.message) } } }
for (const id of ['post-title', 'post-date', 'post-tags', 'post-categories', 'post-draft', 'editor']) $(id).addEventListener('input', changed)
for (const event of ['keyup', 'pointerup', 'select', 'focus']) $('editor').addEventListener(event, updateContext)
$('editor').addEventListener('input', updateContext)
$('editor').addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() })
$('editor').addEventListener('drop', event => { if (event.dataTransfer.files.length) { event.preventDefault(); upload([...event.dataTransfer.files], true) } })
$('editor').addEventListener('paste', event => { const files = [...(event.clipboardData?.files || [])]; if (files.length) { event.preventDefault(); upload(files, true) } })
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save().catch(e => toast(e.message)) } })
window.addEventListener('beforeunload', event => { if (state.dirty) { remember(); event.preventDefault(); event.returnValue = '' } })
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => $(button.dataset.close).close() })
document.querySelectorAll('[data-format]').forEach(button => { button.onclick = () => format(button.dataset.format) })
document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => { $('editor-panes').className = `editor-panes ${button.dataset.view}`; document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('selected', b === button)) } })
document.querySelectorAll('[data-suggestion]').forEach(button => { button.onclick = () => {
  const prompts = { review: '请看看当前选区或小节的结构、表达和技术说明应该怎样调整，先给我具体建议。', images: '当前选区或小节还需要哪些图片？请按位置列出图片内容、用途和建议图注。', references: '请整理当前小节提到的参考作品，列出作品名、作者、来源链接，以及我可以借鉴的具体思路；不确定的部分请标出。' }
  $('agent-mode').value = 'ask'; $('mode-help').textContent = help.ask; $('agent-question').value = prompts[button.dataset.suggestion]; $('agent-question').focus()
} })

async function boot() {
  setTheme(localStorage.getItem('writer:theme') ? localStorage.getItem('writer:theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)
  try {
    const [posts] = await Promise.all([api('/api/posts'), connection(), loadAssets()])
    state.posts = posts
    renderPosts()
    if (posts.length) {
      const last = localStorage.getItem('writer:last-post')
      await loadPost(posts.find(p => p.path === last)?.path || posts[0].path)
    }
    else { $('save-status').textContent = '创建第一篇文章即可开始'; newDialog() }
  }
  catch (error) { $('save-status').textContent = `载入失败：${error.message}`; toast(error.message) }
}
boot()
