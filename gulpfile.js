var gulp = require("gulp"),
    jade = require('gulp-jade'),
    prettify = require('gulp-prettify'),
    wiredep = require('wiredep').stream,
    useref = require('gulp-useref'),
    uglify = require('gulp-uglify'),
    clean = require('gulp-clean'),
    gulpif = require('gulp-if'),
    filter = require('gulp-filter'),
    size = require('gulp-size'),
    less = require('gulp-less'),
    path = require('path'),
    concat = require('gulp-concat'),
    imagemin = require('gulp-imagemin'),
    minifyCss = require('gulp-minify-css'),
    browserSync = require('browser-sync'),
    gutil = require('gulp-util'),
    reload = browserSync.reload,
    ftp = require('vinyl-ftp');

// ====================================================
// ====================================================
// ============== Локальная разработка src ============

// Компилируем Jade в html
gulp.task('jade', function() {
    gulp.src('_dev/templates/pages/*.jade')
        .pipe(jade({
            pretty: true
        }))
        .on('error', log)
        .pipe(gulp.dest('_dev/'))
        .pipe(reload({stream: true}));
});

// Компилируем sass в css
gulp.task('less', function () {
    return gulp.src('_dev/less/**/*.less')
        .pipe(less())
        .pipe(concat("main.css"))
        .pipe(minifyCss({ext: '-min.css'}))
        .pipe(gulp.dest('./_dev/css'));
});

// Запускаем локальный сервер (только после компиляции jade&sass и wiredep)
gulp.task('server', ['wiredep','jade','less'], function () {
    browserSync({
        notify: true,
        port: 9000,
        proxy: "my.ru/_dev/"
    });
});

// Подключаем ссылки на bower
gulp.task('wiredep', function () {
    gulp.src('_dev/templates/common/*.jade')
        .pipe(wiredep({
            ignorePath: /^(\.\.\/)*\.\./
        }))
        .pipe(gulp.dest('_dev/templates/common/'))
});

// слежка и запуск задач
gulp.task('watch', function () {
    gulp.watch('_dev/templates/**/*.jade', ['jade']).on('change', reload);
    gulp.watch('_dev/less/**/*.less', ['less']).on('change', reload);
    gulp.watch('bower.json', ['wiredep']);
    gulp.watch('_dev/js/**/*.js').on('change', reload);
});

// Задача по-умолчанию
gulp.task('default', ['server', 'watch']);


// ====================================================
// ====================================================
// ===================== Функции ======================

// Более наглядный вывод ошибок
var log = function (error) {
    console.log([
        '',
        "----------ERROR MESSAGE START----------",
        ("[" + error.name + " in " + error.plugin + "]"),
        error.message,
        "----------ERROR MESSAGE END----------",
        ''
    ].join('\n'));
    this.end();
}

// ====================================================
// ====================================================
// =============== Важные моменты  ====================
// gulp.task(name, deps, fn)
// deps - массив задач, которые будут выполнены ДО запуска задачи name
// внимательно следите за порядком выполнения задач!


// ====================================================
// ====================================================
// ================= Сборка DIST ======================

// Очистка папки
gulp.task('clean', function () {
    return gulp.src('dist')
        .pipe(clean());
});

// Переносим HTML, CSS, JS в папку dist
gulp.task('useref', function () {
    var assets = useref.assets();
    return gulp.src('_dev/*.html')
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss({compatibility: 'ie8'})))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

// Перенос шрифтов
gulp.task('fonts', function() {
    gulp.src('_dev/fonts/*')
        .pipe(filter(['*.eot','*.svg','*.ttf','*.woff','*.woff2']))
        .pipe(gulp.dest('dist/fonts/'))
});

// Картинки
gulp.task('images', function () {
    return gulp.src('_dev/img/**/*')
        .pipe(imagemin({
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest('dist/img'));
});

// Остальные файлы, такие как favicon.ico и пр.
gulp.task('extras', function () {
    return gulp.src([
        '_dev/*.*',
        '!_dev/*.html'
    ]).pipe(gulp.dest('dist'));
});

// Сборка и вывод размера содержимого папки dist
gulp.task('dist', ['useref', 'images', 'fonts', 'extras'], function () {
    return gulp.src('dist/**/*').pipe(size({title: 'build'}));
});

// Собираем папку DIST (только после компиляции Jade и Less)
gulp.task('build', ['clean', 'wiredep', 'jade', 'less'], function () {
    gulp.start('dist');
});

// Проверка сборки
gulp.task('server-dist', function () {
    browserSync({
        notify: false,
        port: 8000,
        proxy: "my.ru/dist"
    });
});


// ====================================================
// ====================================================
// ===== Отправка проекта на сервер ===================

gulp.task( 'deploy', function() {

    var conn = ftp.create( {
        host:     '/',
        user:     'name',
        password: 'password',
        parallel: 10,
        log: gutil.log
    } );

    var globs = [
        'dist/**/*'
    ];

    return gulp.src(globs, { base: 'dist/', buffer: false })
        .pipe(conn.dest( 'public_html/'));

});
