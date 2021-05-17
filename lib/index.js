// TODO: Implement module
const { src, dest, parallel, series, watch } = require('gulp')
const del = require('del')
// 自动加载所有插件
const loadPlugins = require('gulp-load-plugins')
// 本地开发服务器
const browserSync = require('browser-sync')
const bs = browserSync.create()
// 返回当前命令行的工作目录
const cwd = process.cwd()
let config = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}
try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (error) {

}
const plugins = loadPlugins()

// 样式文件的编译
const style = () => {
  // base属性是为了输入时能够目录保持一致
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
  // outputStyle:expanded可以让编译的css文件的花括号换行
    .pipe(plugins.sass({
      outputStyle: 'expanded'
    }))
    .pipe(dest(config.build.temp))
}
// 脚本的编译
const scripts = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
}

// 页面的编译
const pages = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
}

// 图片和字体文件的压缩
const images = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}
const fonts = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 构建public目录
const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

// 删除指定文件
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 开发服务器
const serve = () => {
  // 监听文件的变化，执行gulp构建任务
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, scripts)
  // watch('src/assets/images/**', images)
  // watch('src/assets/fonts/**', fonts)
  watch(config.build.paths.pages, { cwd: config.build.src }, pages)
  // watch('public/**', extra)
  // 开发环境需要监视这些文件
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    // 端口号
    port: 2080,
    // 那些文件发生改变浏览器自动刷新
    files: 'dist/**',
    open: false,
    server: {
      // 配置根目录
      // baseDir: 'dist',
      // 开发环境可以不用对图片，字体进行压缩
      baseDir: [config.build.temp, config.build.src, config.build.public],
      // 设置/node_modules 路径为当前相对路径下的node_modules,用于html页面引入的css
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 对第三方css/js等资源进行本地构建，使其线上能访问,合并下面js或者css之类的文件
/* <!-- build:js assets/scripts/vendor.js -->
  <script src="/node_modules/jquery/dist/jquery.js"></script>
  <script src="/node_modules/popper.js/dist/umd/popper.js"></script>
  <script src="/node_modules/bootstrap/dist/js/bootstrap.js"></script>
  <!-- endbuild -->
  */
const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify())) // 压缩js
    .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 压缩css
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({ collapseWhitespace: true, minifyCSS: true, minifyJS: true }))) // 压缩html
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, scripts, pages)
// 上线前构建，对图片字体进行压缩。
const build = series(clean, parallel(series(compile, useref), images, fonts, extra))

const develop = series(compile, serve)

module.exports = {
  build,
  clean,
  develop
}
