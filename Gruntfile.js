module.exports = function(grunt) {
	"use strict";

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		year: grunt.template.today('yyyy'),

		ts: {
			options: {
				compile: true,
				sourceMap: true,
				declaration: true,
				additionalFlags: '--alwaysStrict',
				newLine: 'LF',
				target: 'ES6',
				noImplicitAny: true,
				noImplicitReturns: true,
				preserveConstEnums: true,
				removeComments: false,
				types: [ 'console' ]
			},
			'SAASound': {
				src: [
					'src/saa/SAASound.ts',
					'src/saa/SAANoise.ts',
					'src/saa/SAAEnv.ts',
					'src/saa/SAAFreq.ts',
					'src/saa/SAAAmp.ts'
				],
				out: 'src/SAASound.js'
			},
			'Player': {
				src: [
					"src/player/globals.ts",
					"src/player/sample.ts",
					"src/player/ornament.ts",
					"src/player/pattern.ts",
					"src/player/position.ts",
					"src/player/runtime.ts",
					"src/player/core.ts"
				],
				out: 'src/Player.js'
			},
			'Tracker': {
				options: {
					sourceMap: false,
					declaration: false,
					removeComments: true,
					suppressImplicitAnyIndexErrors: true,
					types: [ 'console', 'jquery', 'bootstrap', 'lz-string' ]
				},
				src: [ "src/tracker/*.ts" ]
			}
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
			'LZString': {
				files: [{
					expand: true,
					cwd: 'bower_components/lz-string/libs/',
					src: 'lz-string*',
					dest: 'build/app',
					flatten: true,
					filter: 'isFile'
				}]
			},
			'app': {
				files: [{
					expand: true,
					cwd: 'src/',
					src: [
						'Player.js*',
						'SAASound.js*',
						'Commons.js',
						'Audio.js'
					],
					dest: 'build/app',
					flatten: true,
					filter: 'isFile'
				}]
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
						'src/bootstrap.mods/touchspin/bootstrap-touchspin.js',
						'src/bootstrap.mods/confirm/bootstrap-confirm.js'
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
						'src/tracker/init.js',
						'src/tracker/file.js',
						'src/tracker/file.dialog.js',
						'src/tracker/tracklist.js',
						'src/tracker/smporn.js',
						'src/tracker/manager.js',
						'src/tracker/core.js',
						'src/tracker/controls.js',
						'src/tracker/keyboard.js',
						'src/tracker/mouse.js',
						'src/tracker/paint.js',
						'src/tracker/doc.js',
						'src/tracker/gui.js'
					]
				}
			}
		},
		htmlbuild: {
			'templates': {
				src: 'templates/index.html',
				dest: 'build/',
				options: {
					relative: true,
					sections: {
						menu: 'templates/menu.html',
						header: 'templates/header.html',
						footer: 'templates/footer.html',
						editor: {
							trk: 'templates/trackedit.html',
							smp: 'templates/smpedit.html',
							orn: 'templates/ornedit.html'
						},
						dialog: {
							file: 'templates/dlg-file.html',
							about: 'templates/dlg-about.html',
							commons: 'templates/dlg-commons.html'
						}
					}
				}
			}
		},
		clean: {
			'app': [
				'src/Player.js*',
				'src/SAASound.js*'
			],
			'Tracker': {
				src: [ 'src/tracker/*.js' ],
				filter: function(filepath) {
					var path = require('path');
					var fileobj = path.parse(filepath);
					delete fileobj.base;
					fileobj.ext = '.ts';
					return grunt.file.exists(path.format(fileobj));
				}
			},
			'tmpdirs': [ '.tscache' ]
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
				preserveComments: /^!/,
				ASCIIOnly: true,
				screwIE8: true
			},
			'scripts': {
				files: {
					'build/init.js': 'src/init.js',
					'build/app/bootstrap.min.js': 'build/app/bootstrap.js',
					'build/app/Commons.min.js': 'build/app/Commons.js',
					'build/app/Audio.min.js': 'build/app/Audio.js',
/* ES6 uglify issues :(
					'build/app/SAASound.min.js': 'build/app/SAASound.js',
					'build/app/Player.min.js': 'build/app/Player.js',
					'build/app/Tracker.min.js': 'build/app/Tracker.js'
*/
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
					banner: "/*!\n * SAA1099Tracker v<%= pkg.version %>\n * Copyright (c) <%= year %> Martin Borik <mborik@users.sourceforge.net>\n * Licensed under MIT\n *\/"
				},
				files: {
					'build/css/styles.min.css': 'build/css/styles.css',
					'build/css/tracker.min.css': 'build/css/tracker.css'
				}
			}
		}
	});

	// Default line endings
	grunt.util.linefeed = '\n';

	// Load required modules
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-html-build');
	grunt.loadNpmTasks('grunt-ts');

	// Task definitions
	grunt.registerTask('default', [ 'ts','copy','concat','htmlbuild','clean','less','uglify','cssmin' ]);
	grunt.registerTask('styles', [ 'less','uglify','cssmin' ]);
};