/** Tracker.manager submodule */
//---------------------------------------------------------------------------------------
var Manager = (function () {
	function Manager(app) {
	    this.clipboard = '';

        this.copyFromTracklist = function () {
			var p = app.player,
				sel = app.tracklist.selection,
				ch = sel.len ? sel.channel : app.modeEditChannel,
				line = sel.len ? sel.line : p.currentLine,
				len = sel.len + 1,
				pos = p.position[p.currentPosition] || p.nullPosition,
				pp = p.pattern[pos.ch[ch].pattern],
				data = pp.export(line, len, false);

            this.clipboard = 'STMF.trk:' + JSON.stringify(data, null, '\t');
        };

        this.pasteToTracklist = function () {
            if (this.clipboard.indexOf('STMF.trk:[') !== 0)
                return false;

            var p = app.player,
				sel = app.tracklist.selection,
				ch = sel.len ? sel.channel : app.modeEditChannel,
				line = sel.len ? sel.line : p.currentLine,
				len = sel.len ? (sel.len + 1) : void 0,
				pos = p.position[p.currentPosition] || p.nullPosition,
				pp = p.pattern[pos.ch[ch].pattern],
				data = this.clipboard.substr(9);

			try {
				data = JSON.parse(data);
			}
			catch (e) { return false }

            if (!(data instanceof Array && data.length > 0))
                return false;

            pp.parse(data, line, len || data.length);
            return true;
        };
	}

	return Manager;
})();
//---------------------------------------------------------------------------------------
