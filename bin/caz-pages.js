#!/usr/bin/env node
// console.log('caz-pages')
// 在命令行后默认拼接参数
process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))

require('gulp/bin/gulp')
