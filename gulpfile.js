/* File: gulpfile.js */

// grab our packages
var gulp   = require('gulp'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    nodemon = require('gulp-nodemon'),
    notify = require('gulp-notify'),
    livereload = require('gulp-livereload'),
    mocha = require('gulp-mocha');

// define the default task and add the watch task to it
gulp.task('default', ['watch']);

// configure the jshint task
gulp.task('lint', function() {
  return gulp.src(['./app.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

// Mocha Task
gulp.task('mocha', function() {
    return gulp.src(['test/**/*.js'])
        .pipe(mocha({ reporter: 'nyan', timeout: 5000 }))
        .once('error', function () {
            process.exit(1);
        })
        .once('end', function () {
            process.exit();
        });
});

// configure which files to watch and what tasks to use on file changes
gulp.task('watch', function() {
    gulp.watch(['app.js'], ['lint']);
});

// Default Task
gulp.task('default', ['lint', 'watch']);

// Develop Task
gulp.task('develop', function() {
    // listen for changes
    livereload.listen();
    // configure nodemon
    nodemon({
        // the script to run the app
        script: 'app.js',
        ext: 'js'
    }).on('restart', function(){
        // when the app has restarted, run livereload.
        gulp.src('app.js')
            .pipe(livereload())
            .pipe(notify('Reloading page, please wait...'));
    })
});
