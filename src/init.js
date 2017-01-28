/*!
 * SAA1099Tracker
 * Copyright (c) 2012-2016 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------
(function() {
	var path = 'app/';
	var loc = window.location;
	var dev = /[\?&#]dev/.test(loc.search || loc.hash) ? '' : '.min';
	var el = document.getElementsByTagName('script')[0];
	var libs = [
		'jquery',
		'lz-string',
		'bootstrap',
		'Audio',
		'Commons',
		'!SAASound',
		'!Player',
		'!Tracker'
	];

	var pattern = /(?!\/)[a-z]+?\.js(\?.+)?$/;
	if (el && el.src.substr(0, 4) === 'http' && pattern.test(el.src)) {
		path = el.src.replace(pattern, path).replace(loc.origin, '');
	}
	if (process && process.versions && process.versions.electron !== undefined) {
		window.electron = require('electron');
		window.jQuery = window.$ = require('./' + path + libs.shift() + dev);
		window.LZString = require('./' + path + libs.shift() + dev);
		require('./' + path + libs.shift() + dev);
	}

	el = document.getElementsByTagName('head')[0];
	libs.forEach(function(lib) {
		var s = document.createElement('script');
		if (lib[0] === '!') {
			s.setAttribute('defer', '');
			lib = lib.substr(1);
		}
		s.setAttribute('src', (path + lib + dev + '.js'));
		el.appendChild(s);
	});

	window.location.appPath = path;
	window.dev = !dev;
})();
