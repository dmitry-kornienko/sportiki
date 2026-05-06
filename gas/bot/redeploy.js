#!/usr/bin/env node
// Перезаписывает существующий деплоймент вместо создания нового.
// Использование: node redeploy.js <deploymentId>
// Если ID не передан — берёт первый задеплоенный (не @HEAD).

const { execSync } = require('child_process')

let id = process.argv[2]

if (!id) {
	const output = execSync('npx clasp deployments').toString()
	const existing = output
		.split('\n')
		.map(l => l.trim())
		.filter(l => l.startsWith('-') && !l.includes('@HEAD'))

	if (!existing.length) {
		console.log('Деплоймент не найден — создаём первый...')
		execSync('npx clasp deploy', { stdio: 'inherit' })
		process.exit(0)
	}

	const match = existing[0].match(/- (\S+) @/)
	if (!match) {
		console.error('Не удалось распарсить deployment ID из:', existing[0])
		process.exit(1)
	}
	id = match[1]
}

console.log(`Обновляем деплоймент ${id}...`)
execSync(`npx clasp deploy -i ${id}`, { stdio: 'inherit' })
