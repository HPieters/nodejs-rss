module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffee: {
      compile: {
        files: {
          'app/trends.js': ['app/src/trends.coffee'],
          'admin/admin.js' : ['admin/src/admin.coffee']
        }
      }
    },
    concurrent: {
      server_watch: ['watch', 'nodemon']
    },
    nodemon: {
      server: {
         options: {
            file: 'app/trends.js',
            debug: true,
         }
      }
    },
    watch: {
      coffee: {
        files: 'app/src/*.coffee',
        tasks: 'coffee'
      },
      coffee: {
        files: 'admin/src/*.coffee',
        tasks: 'coffee'
      }



    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-reload');

  // Default task.
  grunt.registerTask('server', ['coffee', 'watch']);

};
