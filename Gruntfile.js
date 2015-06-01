module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		today: grunt.template.today("yyyy"),
		banner:
			'/*\n' +
			' * <%= pkg.name %> v<%= pkg.version %>\n' +
			' * Copyright (c) 2011-<%= today %> <%= pkg.author.name %> <<%= pkg.author.email %>>\n' +
			' */',

		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			gruntfile: {
				src: 'Gruntfile.js'
			},
			files: [
				'saa/SAASound.js'
			]
		},
		typescript: {
			base: {
				src: ['saa/**/*.ts'],
				dest: 'saa/SAASound.js',
				options: {
					module: 'amd', //or commonjs
					target: 'ES5',
					sourceMap: true,
					removeComments: true,
					preserveConstEnums: true,
					watch: false
				}
			}
		},
		uglify: {
			'scripts': {
				options: {
					banner: '<%= banner %>\n',
					preserveComments: 'none'
				},
				files: {
					'saa/SAASound.min.js': 'saa/SAASound.js'
				}
			}
		}
	});

	// Default line endings
	grunt.util.linefeed = '\n';

	// Load required modules
	grunt.loadNpmTasks('grunt-typescript');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Task definitions
	grunt.registerTask('default', [ 'typescript','uglify' ]);
	grunt.registerTask('test', [ 'jshint' ]);
};