import path from 'node:path'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const contentPath = file => file.startsWith('pages/') || file.startsWith('public/images/')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function createPublisher(root, stateDir) {
  const stateFile = path.join(stateDir, 'publish.json')
  let task = null
  try {
    task = JSON.parse(await fs.readFile(stateFile, 'utf8'))
    if (task.status === 'running') {
      task.status = 'failed'
      task.message = '写作台重启，发布跟踪已中断。可以重新点击发布，继续检查远端部署。'
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error }

  async function command(program, args, timeout = 120000) {
    try {
      return (await exec(program, args, { cwd: root, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 })).stdout.trim()
    } catch (error) {
      throw new Error(`${program} 执行失败：${String(error.stderr || error.stdout || error.message).trim().slice(-2000)}`)
    }
  }
  async function update(message, extra = {}) {
    Object.assign(task, extra, { message, updated: new Date().toISOString() })
    await fs.writeFile(stateFile, JSON.stringify(task, null, 2), 'utf8')
  }
  async function changedFiles() {
    const tracked = await command('git', ['diff', '--no-renames', '--name-only', '-z', 'HEAD'])
    const untracked = await command('git', ['ls-files', '--others', '--exclude-standard', '-z'])
    return [...tracked.split('\0'), ...untracked.split('\0')].filter(Boolean)
  }
  async function publish() {
    try {
      if (await command('git', ['branch', '--show-current']) !== 'main') throw new Error('请先将写作台仓库切换到 main 分支，再发布。')
      const unrelated = (await changedFiles()).filter(file => !contentPath(file))
      if (unrelated.length) throw new Error(`还有文章和图片以外的改动，请先处理后再发布：${unrelated.join('、')}`)
      const repo = await command('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])
      const siteUrl = await command('gh', ['api', `repos/${repo}/pages`, '--jq', '.html_url'])
      await update('正在同步远端…', { siteUrl })
      await command('git', ['fetch', 'origin', 'main'])
      await command('git', ['merge', '--ff-only', 'origin/main'])
      await update('正在构建博客…')
      const output = process.platform === 'win32'
        ? await command('cmd.exe', ['/d', '/s', '/c', 'pnpm build'], 300000)
        : await command('pnpm', ['build'], 300000)
      await fs.writeFile(path.join(stateDir, 'publish-build.log'), output, 'utf8')
      await command('git', ['add', '--', 'pages', 'public/images'])
      const staged = await command('git', ['diff', '--cached', '--name-only', '-z'])
      const outside = staged.split('\0').filter(file => file && !contentPath(file))
      if (outside.length) throw new Error('暂存区包含文章和图片以外的文件，已停止发布。')
      if (staged) {
        await update('正在提交文章和配图…')
        const date = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
        await command('git', ['commit', '-m', `Publish blog content ${date}`])
      }
      await update('正在推送到 GitHub…')
      await command('git', ['push', 'origin', 'HEAD:main'])
      const commit = await command('git', ['rev-parse', 'HEAD'])
      await update('等待 GitHub Pages 部署…', { commit })
      const listRuns = async () => JSON.parse(await command('gh', ['run', 'list', '--repo', repo, '--workflow', 'gh-pages.yml', '--branch', 'main', '--commit', commit, '--limit', '1', '--json', 'databaseId,status,conclusion,url']))
      let run
      for (let attempt = 0; attempt < 20 && !run; attempt++) {
        ;[run] = await listRuns()
        if (!run) await sleep(3000)
      }
      if (!run || (run.status === 'completed' && run.conclusion !== 'success')) {
        const previousId = run?.databaseId
        await command('gh', ['workflow', 'run', 'gh-pages.yml', '--repo', repo, '--ref', 'main'])
        run = null
        for (let attempt = 0; attempt < 20 && !run; attempt++) {
          const [latest] = await listRuns()
          if (latest && latest.databaseId !== previousId) run = latest
          else await sleep(3000)
        }
      }
      if (!run) throw new Error('内容已推送，但尚未找到部署任务。请稍后重新点击发布以检查。')
      await update('GitHub Pages 正在部署…', { runUrl: run.url })
      if (run.status !== 'completed') await command('gh', ['run', 'watch', String(run.databaseId), '--repo', repo, '--exit-status', '--interval', '5'], 900000)
      else if (run.conclusion !== 'success') throw new Error(`部署失败，请查看 ${run.url}`)
      await update('已发布到 GitHub Pages', { status: 'completed', finished: new Date().toISOString() })
    } catch (error) {
      await update(error.message, { status: 'failed', finished: new Date().toISOString() })
    }
  }
  return {
    get busy() { return task?.status === 'running' },
    get status() { return task },
    async start() {
      if (task?.status === 'running') return task
      task = { status: 'running', message: '准备发布…', created: new Date().toISOString() }
      await update(task.message)
      publish().catch(error => console.error('发布状态保存失败：', error.message))
      return task
    },
  }
}
