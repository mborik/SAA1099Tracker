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
						cwd: 'bower_components/bootstrap/dist/fonts/',
						src: '**',
						dest: 'build/fonts/',
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
			"commons": {
				src: 'src/Commons.js',
				dest: 'build/js/Commons.js'
			},
			"audio": {
				src: 'src/Audio.js',
				dest: 'build/js/Audio.js'
			}
		},
		concat: {
			options: {
				separator: '\n'
			},
			"bootstrap.js": {
				src: [
					'bower_components/bootstrap/dist/js/bootstrap.js',
					'bower_components/bootstrap-touchspin/src/jquery.bootstrap-touchspin.js',
					'bower_components/bootstrap-toggle/js/bootstrap-toggle.js'
				],
				dest: 'build/js/bootstrap.js'
			}
		},
		typescript: {
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
					declaration: true,
					sourceMap: true
				}
			},
			base: {
				src: ['src/**/*.ts'],
				dest: 'build/js',
				options: {
					module: 'commonjs',
					target: 'ES5',
					preserveConstEnums: true,
					sourceMap: true
				}
			}
		},
		less: {
			'styles': {
				options: {
					paths: ['less', 'bower_components/bootstrap/less']
				},
				files: {
					'build/css/bootstrap.css': 'styles/bootstrap.less'
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
					'build/js/Tracker.min.js': 'build/js/Tracker.js',
					'build/js/Player.min.js': 'build/js/Player.js',
					'build/js/Commons.min.js': 'build/js/Commons.js',
					'build/js/Audio.min.js': 'build/js/Audio.js',
					'build/js/bootstrap.min.js': 'build/js/bootstrap.js'
				}
			}
		},
		cssmin: {
			'styles': {
				options: {
					sourceMap: true
				},
				files: {
					'build/css/bootstrap.min.css': 'build/css/bootstrap.css'
				}
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
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-rename');

	// Task definitions
	grunt.registerTask('default', [ 'typescript','copy','concat','less','uglify','cssmin','rename' ]);
	grunt.registerTask('styles', [ 'less','uglify','cssmin' ]);
	grunt.registerTask('test', [ 'jshint' ]);
};