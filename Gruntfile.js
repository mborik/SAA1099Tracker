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
			jshintrc: '.jshintrc',
			gruntfile: {
				src: 'Gruntfile.js'
			},
			files: [
				'src/Audio.js',
				'src/Player.js'
			]
		},
		copy: {
			'bootstrap': {
				files: [
					{
						expand: true,
						cwd: 'bower_components/bootstrap/dist/',
						src: '**',
						dest: 'build',
						flatten: false,
						filter: 'isFile'
					}
				]
			},
			'jquery': {
				files: [
					{
						expand: true,
						cwd: 'bower_components/jquery/dist/',
						src: '**',
						dest: 'build/js',
						flatten: true,
						filter: 'isFile'
					}
				]
			},
			"audio": {
				src: 'src/Audio.js',
				dest: 'build/js/Audio.js'
			}
		},
		typescript: {
			base: {
				src: ['src/**/*.ts'],
				dest: 'build/js',
				options: {
					newLine: '\n',
					module: 'commonjs',
					target: 'ES5',
					preserveConstEnums: true
				}
			},
			SAASound: {
				src: [
					'saa/SAASound.ts',
					'saa/SAANoise.ts',
					'saa/SAAEnv.ts',
					'saa/SAAFreq.ts',
					'saa/SAAAmp.ts'
				],
				dest: 'build/js/SAASound.js',
				options: {
					module: 'commonjs',
					target: 'ES5',
					declaration: true
				}
			}
		},
		uglify: {
			options: {
				preserveComments: 'some',
				screwIE8: true
			},
			'scripts': {
				files: {
					'build/js/SAASound.min.js': 'build/js/SAASound.js',
					'build/js/Player.min.js': 'build/js/Player.js',
					'build/js/Audio.min.js': 'build/js/Audio.js'
				}
			}
		},
		concat: {
			options: {
				separator: '\n'
			}
		},
		rename: {
			SAASound: {
				ignore: true,
				src: 'build/js/SAASound.d.ts',
				dest: 'saa/SAASound.d.ts'
			}
		}
	});

	// Default line endings
	grunt.util.linefeed = '\n';

	// Load required modules
	grunt.loadNpmTasks('grunt-typescript');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-rename');

	// Task definitions
	grunt.registerTask('default', [ 'typescript','copy','uglify','concat','rename' ]);
	grunt.registerTask('test', [ 'jshint' ]);
};