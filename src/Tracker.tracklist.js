/** Tracker.tracklist submodule */
//---------------------------------------------------------------------------------------
var TracklistPosition = (function () {
	function TracklistPosition() {
		this.y = 0;
		this.line = 0;
		this.channel = 0;
		this.column = 0;
		this.start = { x: 0, y: 0 };
		this.compare = function (p) {
			return (this.y === p.y &&
			this.line === p.line &&
			this.channel === p.channel &&
			this.column === p.column);
		}
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
			if (height === void 0) {
				height = app.settings.tracklistAutosize
					? this.countTracklines()
					: app.settings.tracklistLines;
			}

			app.settings.tracklistLines = height;
			height *= app.settings.tracklistLineHeight;

			$(this.obj).prop('height', height).css({ 'height': height * this.zoom });
		};

		this.moveCurrentline = function(delta) {
			if (!app.player.position.length || app.modePlay)
				return;

			var line = app.player.currentLine + delta,
				pos = app.player.currentPosition,
				pp = app.player.position[pos];

			if (line < 0)
				line += pp.length;
			else if (line >= pp.length)
				line -= pp.length;

			app.player.currentLine = line;
		}
	}

	return Tracklist;
})();
//---------------------------------------------------------------------------------------