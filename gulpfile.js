/* File: gulpfile.js */

// grab our packages
var gulp   = require('gulp'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    nodemon = require('gulp-nodemon'),
    notify = require('gulp-notify'),
    livereload = require('gulp-livereload'),
    mocha = require('gulp-mocha'),
    coveralls = require('gulp-coveralls'),
    istanbul = require('gulp-istanbul'),
    plumber = require('gulp-plumber');

// define the default task and add the watch task to it
gulp.task('default', ['watch']);

///////////////////////////////////////////////////////////////////////////////
// configure the jshint task                                                 //
///////////////////////////////////////////////////////////////////////////////
gulp.task('lint', function() {
  return gulp.src(['./app.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

///////////////////////////////////////////////////////////////////////////////
// Mocha task                                                                //
///////////////////////////////////////////////////////////////////////////////

gulp.task('mocha', function(cb){
    // Track src files that should be covered
    return gulp.src(['./app.js', './services/chatio.js'])
        .pipe(istanbul({ includeUntested: true })) // Covering files
        .pipe(istanbul.hookRequire()) // Force `require` to return covered files
        .on('finish', function() {
            // Specify server specs
            gulp.src(['test/**/*.js'], {read: false})
            .pipe(plumber())
            .pipe(mocha({
                reporter: 'spec',
                timeout: 20000
            }))
            // Write reports to Istanbul
            .pipe(istanbul.writeReports())
            .once('end', function () {
                process.exit();
            })
            .once('error', function () {
                process.exit(1);
            })
    });
});

///////////////////////////////////////////////////////////////////////////////
// configure which files to watch and what tasks to use on file changes      //
///////////////////////////////////////////////////////////////////////////////
gulp.task('watch', function() {
    gulp.watch(['app.js'], ['lint']);
});

///////////////////////////////////////////////////////////////////////////////
// Coverage report                                                           //
///////////////////////////////////////////////////////////////////////////////
gulp.task('coveralls', function () {
    return gulp.src(['./coverage/lcov.info'])
        .pipe(coveralls());
});

///////////////////////////////////////////////////////////////////////////////
// Default Task                                                              //
///////////////////////////////////////////////////////////////////////////////
gulp.task('default', ['lint', 'watch']);

///////////////////////////////////////////////////////////////////////////////
// Default Task                                                              //
///////////////////////////////////////////////////////////////////////////////
gulp.task('test', ['mocha', 'coveralls']);

///////////////////////////////////////////////////////////////////////////////
// Develop Task                                                              //
///////////////////////////////////////////////////////////////////////////////
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
