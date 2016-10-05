'use strict'

const gulp        = require('gulp')
const concat      = require('gulp-concat')
const sass        = require('gulp-sass')
const stylus      = require('gulp-stylus')
const rename      = require('gulp-rename')
const uglify      = require('gulp-uglify')
const cleanCSS    = require('gulp-clean-css')
const babel       = require('gulp-babel')
const gulpsync    = require('gulp-sync')(gulp)
const jshint      = require('gulp-jshint')
const stylish     = require('jshint-stylish')
const expect      = require('gulp-expect-file')
const plumber     = require('gulp-plumber')
const browserSync = require('browser-sync').create()
const autoprefixer= require('gulp-autoprefixer')
const rewriteCSS  = require('gulp-rewrite-css')

const _srcdir = 'tracim/public/assets/'
const _tpldir = 'tracim/templates/'

const listCssFiles = [
  _srcdir + 'css/bootstrap.css',
  _srcdir + 'font-awesome-4.2.0/css/font-awesome.css',
  _srcdir + 'jstree/themes/default/style.min.css',
  _srcdir + 'jstree/themes/tracim/style.css',
  //_srcdir + 'tablesorter/themes/blue/style.css', // file commented in .mak
  _srcdir + 'datatables/jquery.dataTables.css',
  //_srcdir + 'css/external/google-code-prettify/prettify.css', // file from master_no_toolbar_no_login.mak

  _srcdir + 'css/dashboard.css',
]
const listJsFiles = [
  //_srcdir + 'js/scripts_es5.js'
  _srcdir + 'js/jquery.min.js', // v 1.11
  _srcdir + 'js/bootstrap.js',

  _srcdir + 'js/ie10-viewport-bug-workaround.js',
  _srcdir + 'tinymce/js/tinymce/tinymce.min.js',
  _srcdir + 'jstree/jstree.js',

  _srcdir + 'tablesorter/jquery.tablesorter.js',
  _srcdir + 'datatables/jquery.dataTables.js',

  // files bellow are taken from tempaltes/master_no_toolbar_no_login.mak
  // some of the js links does not exists in the repo, every files taken from master_no_toolbar_no_login.mak are commented

  //_srcdir + 'js/ie-emulation-modes-warning.js',
  //_srcdir + 'javascript/jquery.js',
  //_srcdir + 'javascript/tracim.js',
  //_srcdir + 'assets/js/bootstrap.min.js',
  //_srcdir + 'javascript/external/jquery.hotkeys.js',
  //_srcdir + 'javascript/external/google-code-prettify/prettify.js',
  //_srcdir + 'javascript/external/bootstrap-wysiwyg.js',
  //_srcdir + 'javascript/external/bootstrap-datetimepicker.min.js',
]

// CSS task
gulp.task('css', function () {
  const dest = _srcdir + '/dist/'

  return gulp.src(listCssFiles)
    .pipe(expect({verbose: true}, listCssFiles))
    //.pipe(sass().on('error', sass.logError))
    .pipe(rewriteCSS({
        destination: dest,
        //debug: true
    }))
    .pipe(stylus())
    .pipe(autoprefixer({
        browsers: ['last 2 versions'],
        cascade: false
    }))
    .pipe(concat('all.css'))
    .pipe(gulp.dest(dest))
    .pipe(browserSync.stream())
})

// JS tasks
gulp.task('js_hint', function() {
  return gulp.src(_srcdir + '/js/scripts.js')
    .pipe(expect({verbose: true}, _srcdir + '/js/scripts.js'))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
})
gulp.task('js_transpiling', function() {
  return gulp.src(_srcdir + '/js/scripts.js')
    .pipe(plumber())
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(concat('scripts_es5.js'))
    .pipe(gulp.dest(_srcdir + '/js/'))
})
gulp.task('js_concat', function() {
  return gulp.src(listJsFiles)
    .pipe(expect({verbose: true}, listJsFiles))
    .pipe(concat('all.js'))
    .pipe(gulp.dest(_srcdir + '/dist/'))
    .pipe(browserSync.stream())
})
gulp.task('js_sync', gulpsync.sync(['js_transpiling', 'js_concat']))
gulp.task('js', ['js_hint', 'js_sync'])

gulp.task('dev', ['css', 'js'])

// BUILD tasks
gulp.task('prod_css', ['css'], function () {
    return gulp.src(_srcdir + '/dist/all.css')
        .pipe(expect({verbose: true}, _srcdir + '/dist/all.css'))
        .pipe(cleanCSS({keepSpecialComments:0}))
        .pipe(concat('all.min.css'))
        .pipe(gulp.dest(_srcdir + '/dist/'))
})
gulp.task('prod_js', ['js'], function () {
    return gulp.src(_srcdir + '/dist/all.js')
        .pipe(expect({verbose: true}, _srcdir + '/dist/all.js'))
        .pipe(uglify())
        .pipe(concat('all.min.js'))
        .pipe(gulp.dest(_srcdir + '/dist/'))
})
gulp.task('prod', ['prod_css', 'prod_js'])

// WATCH task
gulp.task('watch', function () {
  gulp.watch([
    _srcdir + '/js/*.js',
    '!'+_srcdir+'/js/scripts_es5.js',
    '!'+_srcdir+'/js/*.min.*'
  ], {verbose: true, debounceDelay: 2000}, ['js'])

  gulp.watch([
    _srcdir + '/css/*{.styl, .css}',
    '!'+_srcdir+'/css/*.min.*',
    '!'+_srcdir+'/css/*.map'
  ], ['css'])
})

// LIVERELOAD task
gulp.task('livesync', function() {
  browserSync.init({
    proxy: "127.0.0.1:5000",
    browser: "chromium",
    port: 5001
  })

  gulp.watch(_tpldir + '**/*.html').on('change', browserSync.reload)
})

gulp.task('watchsync', ['watch', 'livesync'])

// DEFAULT task
gulp.task('default', function () {
  console.log(`
    Usable tasks : watchsync, watch, dev, prod, js, css
    Other available tasks : livesync, js_sync, js_concat, js_hint, prod_css, prod_js
  `)
})

