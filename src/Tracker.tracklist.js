/** Tracker.tracklist submodule */
//---------------------------------------------------------------------------------------
var TracklistPosition = (function () {
	function TracklistPosition(y, line, channel, column, sx, sy) {
		this.y = y || 0;
		this.line = line || 0;
		this.channel = channel || 0;
		this.column = column || 0;
		this.start = { x: (sx || 0), y: (sy || 0) };

		this.set = function(p) {
			if (!(p instanceof TracklistPosition))
				throw 'invalid object type';

			this.y = p.y;
			this.line = p.line;
			this.channel = p.channel;
			this.column = p.column;
			this.start.x = p.start.x;
			this.start.y = p.start.y;
		};

		this.compare = function (p) {
			if (p instanceof TracklistPosition)
				return (this.y === p.y &&
				        this.line === p.line &&
				        this.channel === p.channel &&
				        this.column === p.column);
		};

	}

	return TracklistPosition;
})();
//---------------------------------------------------------------------------------------
var Tracklist = (function () {
	function Tracklist(app) {
		this.obj = null;
		this.ctx = null;
		this.zoom = 2;

		// fontWidth = 6 : default width of pixelfont
		this.canvasData = {
			// offsets to column positions in channel data premultiplied by fontWidth:
			//         0   4567 9AB
			//        "A-4 ABFF C01"
			columns: [ 0, 24, 30, 36, 42, 54, 60, 66 ],

			// selection width: (12 columns + 1 padding) * fontWidth
			selWidth : (12 + 1) * 6,

			// channel width: (12 columns + 2 padding) * fontWidth
			chnWidth : (12 + 2) * 6,

			// trackline width:
			// (((12 columns + 2 padding) * 6 channels) + 2 tracknum.columns) * fontWidth
			lineWidth: (((12 + 2) * 6) + 2) * 6,

			// horizontal centering of trackline to canvas width
			center   : 0,

			// trackline data offset: center + (2 tracknums + 2 padding) * fontWidth
			trkOffset: 0,

			// vertical padding of pixelfont in trackline height
			vpad     : 0
		};

		// calculated absolute positions of X:channels/columns and Y:tracklines in canvas
		this.offsets = {
			// 6 channels of 8 column (+1 padding) positions
			x: [ new Array(9), new Array(9), new Array(9), new Array(9), new Array(9), new Array(9) ],
			y: []
		}

//---------------------------------------------------------------------------------------
		this.countTracklines = function() {
			var s = $('#statusbar').offset(),
				t = $('#tracklist').offset(),
				h = app.settings.tracklistLineHeight;
			return Math.max(((((s.top - t.top) / h / this.zoom) | 1) - 2), 5);
		};

		this.setHeight = function(height) {
			var sett = app.settings;

			if (height === void 0) {
				height = sett.tracklistAutosize
					? this.countTracklines()
					: sett.tracklistLines;
			}

			sett.tracklistLines = height;
			height *= sett.tracklistLineHeight;

			$(this.obj).prop('height', height).css({ 'height': height * this.zoom });
		};

		this.moveCurrentline = function(delta, noWrap) {
			var player = app.player,
				line = player.currentLine + delta,
				pos = player.currentPosition,
				pp = player.position[pos];

			if (app.modePlay || pp === void 0)
				return;

			if (noWrap)
				line = Math.min(Math.max(line, 0), pp.length - 1);
			else if (line < 0)
				line += pp.length;
			else if (line >= pp.length)
				line -= pp.length;

			player.currentLine = line;
		};

		this.pointToTracklist = function(x, y) {
			var i, j, chl,
				lines = app.settings.tracklistLines,
				half = lines >> 1,
				ln = app.player.currentLine - half;

			for (i = 0; i < lines; i++, ln++) {
				if (y >= this.offsets.y[i] && y <= this.offsets.y[i + 1]) {
					for (chl = 0; chl < 6; chl++) {
						if (x >= this.offsets.x[chl][0] && x <= this.offsets.x[chl][8]) {
							for (j = 0; j < 8; j++) {
								if (x >= this.offsets.x[chl][j] && x <= this.offsets.x[chl][j + 1])
									return new TracklistPosition(i, Math.max(ln, 0), chl, j, x, y);
							}
						}
					}
				}
			}
		};
	}

	return Tracklist;
})();
//---------------------------------------------------------------------------------------
