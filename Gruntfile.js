module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			jshintrc: '.jshintrc',
			gruntfile: {
				src: 'Gruntfile.js'
			},
			files: [
				'build/js/Audio.js',
				'build/js/Commons.js',
				'build/js/Player.js',
				'build/js/SAASound.js',
				'build/js/Tracker.js'
			]
		},
		copy: {
			'bootstrap': {
				files: [{
					expand: true,
					cwd: 'bower_components/bootstrap/dist/fonts/',
					src: '**',
					dest: 'build/fonts/',
					flatten: false,
					filter: 'isFile'
				}]
			},
			'jquery': {
				files: [{
					expand: true,
					cwd: 'bower_components/jquery/dist/',
					src: '**',
					dest: 'build/js',
					flatten: true,
					filter: 'isFile'
				}]
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
					'src/touchspin.mod/jquery.bootstrap-touchspin.js',
					'bower_components/bootstrap-toggle/js/bootstrap-toggle.js'
				],
				dest: 'build/js/bootstrap.js'
			},
			"Tracker.js": {
				src: [
					'src/Tracker.init.js',
					'src/Tracker.tracklist.js',
					'src/Tracker.smporn.js',
					'src/Tracker.core.js',
					'src/Tracker.controls.js',
					'src/Tracker.keyboard.js',
					'src/Tracker.paint.js',
					'src/Tracker.gui.js'
				],
				dest: 'build/js/Tracker.js'
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
			Player: {
				src: ['src/Player.ts'],
				dest: 'build/js/Player.js',
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
					'build/css/styles.css': 'styles/bootstrap.less'
				}
			}
		},
		uglify: {
			options: {
				compress: { drop_console: true },
				preserveComments: 'some',
				ASCIIOnly: true,
				screwIE8: true
			},
			'scripts': {
				files: {
					'build/init.js': 'src/init.js',
					'build/js/bootstrap.min.js': 'build/js/bootstrap.js',
					'build/js/Commons.min.js': 'build/js/Commons.js',
					'build/js/Audio.min.js': 'build/js/Audio.js',
					'build/js/SAASound.min.js': 'build/js/SAASound.js',
					'build/js/Player.min.js': 'build/js/Player.js',
					'build/js/Tracker.min.js': 'build/js/Tracker.js'
				}
			}
		},
		cssmin: {
			'styles': {
				options: {
					sourceMap: true
				},
				files: {
					'build/css/styles.min.css': 'build/css/styles.css'
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