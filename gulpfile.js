// Imports
var del = require('del');
var eventStream = require('event-stream');
var gulp = require('gulp');
var handlebars = require('handlebars');
var jshint = require('gulp-jshint');
var map = require('map-stream');
var rename = require('gulp-rename');
var streamqueue = require('streamqueue');
var stylish = require('jshint-stylish');
var watch = require('gulp-watch');


/** !!!! Critical Configuration Variables !!!! **/
// Build and src directories
var buildDir = 'build/';
var webDir = 'web/';
var pagesDir = webDir + 'pages/';

/*
These are your static directories. Files in these directories will get copied as
they are into the build directory */
var staticDirs = [
  'images/',
  'scripts/',
  'styles/'
];

/*
These are your pages. The filename must match a file in the pages directory with
the convention of _${file_name}.html and there should also be a css file with
the convention of ${file_name}.css in the styles directory or else the page
will lack theming */
var pages = [
  { file_name: 'ideas', title: 'Ideas' },
  { file_name: 'index', title: 'WSU Hackathon' },
  { file_name: 'pictures', title: 'Pictures' },
  { file_name: 'sponsorship', title: 'Sponsorship' }
];

var picturesTemplateData = { picturesUrl: 'http://hackathon.eecs.wsu.edu/hosted_images/hackathon_02' };


/** The ugly buildy bits **/
var webStaticGlobs = staticDirs.map(function(dir) { return webDir + dir + '**/*'});
var buildStaticGlobs = staticDirs.map(function(dir) { return buildDir + dir + '**/*'});


// A basic clean task
gulp.task('clean', function(cb) {
  del(buildDir, cb);
});


// A clean task that only cleans the static stuff
gulp.task('clean-static', function(cb) {
  del(buildStaticGlobs, cb);
});


// This takes all the static assets and simply moves them to the build directory.
gulp.task('static', ['clean-static'], function() {
  var tasks = staticDirs.map(function(dir) {
    return gulp.src(webDir + dir + '**/*')
               .pipe(gulp.dest(buildDir + dir));
  });

  return eventStream.concat.apply(null, tasks);
});


/*
Handles the template compilation. All it does is take the template at
template.handlebars, compile it, and apply each of the page contents to it */
gulp.task('handle-bars', ['clean', 'static'], function() {
  var buildPageFunct;
  return streamqueue({objectmode: true},
    gulp.src(webDir + 'template.handlebars')
      .pipe(map(function(file, cb) {
        buildPageFunct = handlebars.compile(file.contents.toString());
        cb();
      })),
    buildFiles());

  function buildFiles() {
    var tasks = pages.map(function(page) {
      return gulp.src(pagesDir + '_' + page.file_name + '.html')
        .pipe(map(function(file, cb) {
          page.content = file.contents.toString();

          // Compile the pictures as a template first
          if (page.file_name == 'pictures') {
            var pictures_template = handlebars.compile(page.content);
            page.content = pictures_template(picturesTemplateData)
          }

          file.contents = new Buffer(buildPageFunct(page));
          cb(null, file);
        }))
        .pipe(rename(page.file_name + '.html'))
        .pipe(gulp.dest(buildDir));
    });
    return eventStream.concat.apply(null, tasks);
  }
});


// jshint the server script
gulp.task('jshint-server', function() {
  gulp.src('./server.js')
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});


gulp.task('watch', function() {

  // Autowatch on the static content directories.
  watch(webStaticGlobs, function() {
    gulp.start('static');
  });

  // Autowatch on the handlebars built stuff.
  watch([webDir + '**/*.handlebars', pagesDir + '**/*'], function() {
    gulp.start('handle-bars');
  });
});


gulp.task('build', ['static', 'handle-bars']);
gulp.task('default', ['build', 'watch']);
