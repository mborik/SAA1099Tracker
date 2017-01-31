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
				removeComments: false
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
			'app': {
				options: {
					sourceMap: false,
					declaration: false,
					removeComments: true,
					suppressImplicitAnyIndexErrors: true,
					types: [ 'jquery', 'bootstrap', 'lz-string' ]
				},
				src: [
					"src/commons/*.ts",
					"src/tracker/*.ts"
				]
			}
		},
		copy: {
			'app-fonts': {
				files: [{
					expand: true,
					cwd: 'assets/fonts/',
					src: '**',
					dest: 'build/fonts/',
					flatten: false,
					filter: 'isFile'
				}]
			},
			'app-images': {
				files: [{
					expand: true,
					cwd: 'assets/images/',
					src: '**',
					dest: 'build/img/',
					flatten: false,
					filter: 'isFile'
				}]
			},
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
						'SAASound.js*'
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
			'app': {
				options: {
					process: true,
					separator: ''
				},
				files: {
					'build/app/Commons.js': [
						'src/commons/intro',
						'src/commons/compat.js',
						'src/commons/timer.js',
						'src/commons/browser.js',
						'src/commons/dev.js',
						'src/commons/audio.js',
						'src/commons/number.proto.js'
					],
					'build/app/Tracker.js': [
						'src/tracker/intro',
						'src/tracker/file.js',
						'src/tracker/file.dialog.js',
						'src/tracker/tracklist.js',
						'src/tracker/smporn.js',
						'src/tracker/manager.js',
						'src/tracker/settings.js',
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
							commons: 'templates/dlg-commons.html',
							settings: 'templates/dlg-settings.html'
						}
					}
				}
			}
		},
		clean: {
			'maps': [
				'src/Player.js*',
				'src/SAASound.js*',
				'build/app/*.map'
			],
			'Tracker': {
				src: [
					'src/commons/*.js',
					'src/tracker/*.js'
				],
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
				ASCIIOnly: true,
				screwIE8: true
			},
			'init': {
				options: { preserveComments: /^!/ },
				files: { 'build/init.js': 'src/init.js' }
			},
			'bootstrap': {
				files: { 'build/app/bootstrap.min.js': 'build/app/bootstrap.js' }
			}
		},
		babili: {
			'scripts': {
				files: {
					'build/app/Commons.min.js': 'build/app/Commons.js',
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
				files: { 'build/css/bootstrap.min.css': 'build/css/bootstrap.css' }
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
		},
		electron: {
			options: {
				name: 'SAA1099Tracker',
				dir: '.',
				asar: true,
				prune: true,
				out: 'dist',
				overwrite: true,
				ignore: [
					'/\\.(\\w+)($|/)',
					'/node_modules/electron($|/)',
					'/node_modules/electron-\\w+($|/)',
					'/node_modules/\\.bin($|/)',
					'/node_modules/[-\\w]+?/(test|example|screenshot)s?($|/)',
					'/bower_components($|/)',
					'^/?(src|styles|templates|dist)($|/)',
					'/(Gruntfile|bower)\\.js(on)?'
				],
				'app-copyright': 'Copyright (c) 2017 Martin Borik'
			},
			'win32-x64': {
				options: {
					icon: 'build/favicon.ico',
					platform: 'win32',
					arch: 'x64',
					win32metadata: {
						ProductName: 'SAA1099Tracker',
						InternalName: 'SAA1099Tracker',
						OriginalFilename: 'SAA1099Tracker.exe',
						FileDescription: "SAA1099Tracker",
						CompanyName: 'SAA1099Tracker'
					}
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
	grunt.loadNpmTasks('grunt-electron');
	grunt.loadNpmTasks('grunt-html-build');
	grunt.loadNpmTasks('grunt-ts');

	// Define own multitasks
	grunt.registerMultiTask('babili', "Minify files with Babel's babili preset.", function() {
		var callback = this.async();
		var options = this.options({
			sourceMaps: false,
			removeConsole: true
		});
		var argBabel = require.resolve("babel-cli/bin/babel.js");
		var argPreset = "--presets=" + require.resolve("babel-preset-babili");

		var createdFiles = 0;
		var fileCounter = this.files.length;

		this.files.forEach(function(f) {
			var src = f.src.filter(function(filepath) {
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file ' + filepath + ' not found.');
					return false;
				}
				return true;
			});

			if (!src.length) {
				grunt.log.warn('Destination ' + f.dest + ' not written because src files were empty.');
				if (!(--fileCounter)) {
					grunt.log.ok(createdFiles + '/' + grunt.util.pluralize(createdFiles, 'file/files') + ' created.');
					callback(true);
				}
			}

			var args = [ argBabel ]
				.concat(src)
				.concat([ "-o", f.dest ]);
			if (options.sourceMap)
				args.push("-s");
			args.push(argPreset);
			if (options.removeConsole)
				args.push("--plugins", "transform-remove-console");
			args.push("--no-babelrc");

			grunt.util.spawn({
				cmd: process.execPath,
				args: args,
				opts: {
					stdio: "inherit",
					env: process.env,
				}
			}, function(error, result) {
				if (error) {
					grunt.log.warn('babili of source(s) "' + src + '" failed.');
					var err = new Error('babili failed!');
					if (result.stderr)
						err.message += '\n' + result.stderr + '. \n';
					callback(err);
					return;
				}

				createdFiles++;
				if (!(--fileCounter)) {
					grunt.log.ok(createdFiles + ' ' + grunt.util.pluralize(createdFiles, 'file/files') + ' created.');
					callback(true);
				}
			});
		});
	});

	// Task definitions
	grunt.registerTask('default', [
		'ts', 'copy', 'concat', 'htmlbuild', 'clean',
		'less','uglify','babili','cssmin'
	]);
	grunt.registerTask('styles', [ 'less','uglify','babili','cssmin' ]);
	grunt.registerTask('app', [ 'electron' ]);
};