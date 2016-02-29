/** Tracker.manager submodule */
//---------------------------------------------------------------------------------------
var Manager = (function () {
	function Manager(app) {
	    this.clipboard = '';

//- private methods ---------------------------------------------------------------------
//---------------------------------------------------------------------------------------
		function getBlock () {
			var p = app.player,
				sel = app.tracklist.selection,
				ch = sel.len ? sel.channel : app.modeEditChannel,
				line = sel.len ? sel.line : p.currentLine,
				length = sel.len ? (sel.len + 1) : void 0,
				pos = p.position[p.currentPosition] || p.nullPosition;

			return {
				pp: p.pattern[pos.ch[ch].pattern],
				line: line,
				len: length
			};
		}

// public methods -----------------------------------------------------------------------
//---------------------------------------------------------------------------------------
        this.clearFromTracklist = function () {
        	var o = getBlock();
			o.pp.parse([], o.line, o.len || 1);
        };

        this.copyFromTracklist = function () {
			var o = getBlock(),
				data = o.pp.export(o.line, o.len || 1, false);

            this.clipboard = 'STMF.trk:' + JSON.stringify(data, null, '\t');
        };

        this.pasteToTracklist = function () {
            if (this.clipboard.indexOf('STMF.trk:[') !== 0)
                return false;

            var o = getBlock(),
				data = this.clipboard.substr(9);

			try { data = JSON.parse(data) }
			catch (e) { return false }

            if (!(data instanceof Array && data.length > 0))
                return false;

            o.pp.parse(data, o.line, o.len || data.length);
            return true;
        };
//---------------------------------------------------------------------------------------
		this.clearSample = function () {
			var smp = app.player.sample[app.workingSample];

			smp.name = '';
			smp.loop = 0;
			smp.end = 0;
			smp.releasable = false;
			smp.parse([]);
		};

		this.copySample = function () {
			var smp = app.player.sample[app.workingSample],
				obj = {
					name: smp.name,
					loop: smp.loop,
					end: smp.end,
					releasable: smp.releasable,
					data: smp.export(false)
				};

            this.clipboard = 'STMF.smp:' + JSON.stringify(obj, null, '\t');
		};

		this.pasteSample = function () {
            if (this.clipboard.indexOf('STMF.smp:{') !== 0)
                return false;

			var smp = app.player.sample[app.workingSample],
				obj = this.clipboard.substr(9);

			try { obj = JSON.parse(obj) }
			catch (e) { return false }

            if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0))
                return false;

			smp.parse(obj.data);
			smp.name = obj.name;
			smp.loop = obj.loop;
			smp.end = obj.end;
			smp.releasable = obj.releasable;
			return true;
		};
//---------------------------------------------------------------------------------------
		this.clearOrnament = function () {
			var orn = app.player.ornament[app.workingOrnament];

			orn.name = '';
			orn.data.fill(0);
			orn.loop = orn.end = 0;
		};

		this.copyOrnament = function () {
			var orn = app.player.ornament[app.workingOrnament],
				obj = {
					name: orn.name,
					loop: orn.loop,
					end:  orn.end,
					data: orn.export(false)
				};

            this.clipboard = 'STMF.orn:' + JSON.stringify(obj, null, '\t');
		};

		this.pasteOrnament = function () {
            if (this.clipboard.indexOf('STMF.orn:{') !== 0)
                return false;

			var orn = app.player.ornament[app.workingOrnament],
				obj = this.clipboard.substr(9);

			try { obj = JSON.parse(obj) }
			catch (e) { return false }

            if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0))
                return false;

			orn.parse(obj.data);
			orn.name = obj.name;
			orn.loop = obj.loop;
			orn.end = obj.end;
			return true;
		};
	}

	return Manager;
})();
//---------------------------------------------------------------------------------------
