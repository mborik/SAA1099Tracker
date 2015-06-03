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
				'src/Audio.js'
			]
		},
		typescript: {
			base: {
				src: ['src/**/*.ts'],
				dest: 'src',
				options: {
					newLine: '\n',
					module: 'commonjs',
					target: 'ES5',
					sourceMap: true,
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
				dest: 'saa/SAASound.js',
				options: {
					module: 'commonjs',
					target: 'ES5',
					sourceMap: true,
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
					'build/saa.js': 'saa/SAASound.js',
					'build/player.js': 'src/Player.js'
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