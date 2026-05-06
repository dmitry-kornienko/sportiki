#!/usr/bin/env node
// Деплоит miniapp/dist на ветку gh-pages через git worktree.
// Запускать из корня проекта: node scripts/deploy-gh-pages.js

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'miniapp', 'dist')
const WORKTREE = path.join(os.tmpdir(), 'sportiki-gh-pages')

if (!fs.existsSync(DIST) || !fs.readdirSync(DIST).length) {
  console.error('❌ miniapp/dist пустой или не существует. Сначала запусти build.')
  process.exit(1)
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts })
}

// Убираем старый worktree если остался
try { run(`git worktree remove "${WORKTREE}" --force`, { cwd: ROOT, stdio: 'pipe' }) } catch {}
if (fs.existsSync(WORKTREE)) fs.rmSync(WORKTREE, { recursive: true, force: true })

// Подключаем gh-pages ветку как worktree
try {
  run(`git worktree add "${WORKTREE}" gh-pages`, { cwd: ROOT })
} catch {
  // Ветки нет — создаём сиротскую
  run(`git worktree add --orphan -b gh-pages "${WORKTREE}"`, { cwd: ROOT })
}

// Очищаем worktree (кроме .git)
for (const entry of fs.readdirSync(WORKTREE)) {
  if (entry === '.git') continue
  fs.rmSync(path.join(WORKTREE, entry), { recursive: true, force: true })
}

// Копируем dist
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d)
  }
}
copyDir(DIST, WORKTREE)

// Коммитим и пушим
run('git add -A', { cwd: WORKTREE })
try {
  run('git commit -m "deploy: miniapp to GitHub Pages"', { cwd: WORKTREE })
} catch {
  console.log('Нет изменений для деплоя.')
  run(`git worktree remove "${WORKTREE}" --force`, { cwd: ROOT })
  process.exit(0)
}
run('git push origin gh-pages --force', { cwd: WORKTREE })

// Чистим worktree
run(`git worktree remove "${WORKTREE}" --force`, { cwd: ROOT })
console.log('✅ Miniapp задеплоен на GitHub Pages')
