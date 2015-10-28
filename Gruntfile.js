module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		year: grunt.template.today('yyyy'),

		jshint: {
			jshintrc: '/.jshintrc',
			files: [
				'build/app/Audio.js',
				'build/app/Commons.js',
				'build/app/Player.js',
				'build/app/SAASound.js',
				'build/app/Tracker.js'
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
					dest: 'build/app',
					flatten: true,
					filter: 'isFile'
				}]
			},
			'Commons': {
				src: 'src/Commons.js',
				dest: 'build/app/Commons.js'
			},
			'Audio': {
				src: 'src/Audio.js',
				dest: 'build/app/Audio.js'
			}
		},
		concat: {
			'bootstrap': {
				options: {
					separator: '\n'
				},
				files: {
					'build/app/bootstrap.js': [
						'bower_components/bootstrap/dist/js/bootstrap.js',
						'bower_components/bootstrap-toggle/js/bootstrap-toggle.js',
						'src/touchspin.mod/jquery.bootstrap-touchspin.js',
						'src/confirm.mod/jquery.bootstrap-confirm.js'
					]
				}
			},
			'Tracker': {
				options: {
					process: true,
					separator: ''
				},
				files: {
					'build/app/Tracker.js': [
						'src/Tracker.init.js',
						'src/Tracker.file.js',
						'src/Tracker.tracklist.js',
						'src/Tracker.smporn.js',
						'src/Tracker.core.js',
						'src/Tracker.controls.js',
						'src/Tracker.keyboard.js',
						'src/Tracker.mouse.js',
						'src/Tracker.paint.js',
						'src/Tracker.doc.js',
						'src/Tracker.gui.js'
					]
				}
			},
			'templates': {
				options: {
					process: function (data, file) {
						return '<tpl id="' + file.replace(/^.*\/([\w\-]+)\..+$/, '$1') + '">\n' + data + '</tpl>\n';
					}
				},
				src: [
					'templates/menu.html',
					'templates/header.html',
					'templates/trackedit.html',
					'templates/smpedit.html',
					'templates/ornedit.html',
					'templates/dlg-commons.html',
					'templates/dlg-file.html',
					'templates/dlg-about.html',
					'templates/footer.html'
				],
				dest: '/tmp/templates.tmp'
			}
		},
		typescript: {
			'SAASound': {
				src: [
					'saa/SAASound.ts',
					'saa/SAANoise.ts',
					'saa/SAAEnv.ts',
					'saa/SAAFreq.ts',
					'saa/SAAAmp.ts'
				],
				dest: 'build/app/SAASound.js',
				options: {
					module: 'commonjs',
					target: 'ES5',
					declaration: true,
					sourceMap: true
				}
			},
			'Player': {
				src: ['src/Player.ts'],
				dest: 'build/app/Player.js',
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
					paths: ['bower_components/bootstrap/less']
				},
				files: {
					'build/css/bootstrap.css': 'styles/bootstrap.less',
					'build/css/styles.css': 'styles/loader.less',
					'build/css/tracker.css': 'styles/custom.less'
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
					'build/app/bootstrap.min.js': 'build/app/bootstrap.js',
					'build/app/Commons.min.js': 'build/app/Commons.js',
					'build/app/Audio.min.js': 'build/app/Audio.js',
					'build/app/SAASound.min.js': 'build/app/SAASound.js',
					'build/app/Player.min.js': 'build/app/Player.js',
					'build/app/Tracker.min.js': 'build/app/Tracker.js'
				}
			}
		},
		cssmin: {
			'bootstrap': {
				options: {
					sourceMap: true,
					roundingPrecision: 1
				},
				files: {
					'build/css/bootstrap.min.css': 'build/css/bootstrap.css'
				}
			},
			'styles': {
				options: {
					sourceMap: true,
					processImport: false,
					roundingPrecision: 1,
					banner: "/*!\n * SAA1099Tracker v<%= pkg.version %>\n * Copyright (c) <%= year %> Martin Borik <mborik@users.sourceforge.net>\n * Licensed under MIT\n */"
				},
				files: {
					'build/css/styles.min.css': 'build/css/styles.css',
					'build/css/tracker.min.css': 'build/css/tracker.css'
				}
			}
		},
		htmlmin: {
			templates: {
				options: {
					process: true,
					removeComments: true,
					collapseWhitespace: true,
					conservativeCollapse: false,
					collapseBooleanAttributes: true,
				},
				src: '/tmp/templates.tmp',
				dest: 'build/app/Tracker.tpl.html'
			}
		},
		rename: {
			'SAASound': {
				ignore: true,
				src: 'build/app/SAASound.d.ts',
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
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-rename');

	// Task definitions
	grunt.registerTask('default', [ 'typescript','copy','concat','less','uglify','cssmin','htmlmin','rename' ]);
	grunt.registerTask('styles', [ 'less','uglify','cssmin' ]);
	grunt.registerTask('test', [ 'jshint' ]);
};