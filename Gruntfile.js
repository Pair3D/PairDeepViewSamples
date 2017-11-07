module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! Copyright (c) <%= grunt.template.today("yyyy") %> Pair - <%= pkg.name %> - <%= new Date().toString().substring(0, 24) %> */\n'
      },
      default:{
        files:{
          "js/pair-deep-image.min.js": ["js/third-party/PairFileLoader.js", "js/third-party/PairOBJLoader.js", "js/third-party/PairMTLLoader.js", "js/third-party/pair-TrackballControls.js", "js/pair-helpers.js", "js/pair-interstitial.js", "js/pair-deep-image-viewer.js"]
        }
      }
    }
  });

  // Load the plugins  
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ["uglify"]);

};