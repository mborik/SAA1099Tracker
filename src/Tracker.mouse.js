/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.handleMouseEvent = function (part, obj, e) {
	if (part === 'tracklist') {
		var redraw = false,
			p = this.player,
			pp = p.position[p.currentPosition],
			sel = obj.selection,
			offset = obj.canvasData.offset,
			point = obj.pointToTracklist(e.pageX - offset.left, e.pageY - offset.top),
			line = p.currentLine, i;

		if (this.modePlay || !pp || !point)
			return;

		point.line = Math.min(point.line, pp.length - 1);
		i = point.line - sel.start.line;

		if (e.type === 'mousewheel') {
			e.target.focus();

			if (e.delta < 0)
				obj.moveCurrentline(1);
			else if (e.delta > 0)
				obj.moveCurrentline(-1);
			redraw = true;
		}
		else if (e.type === 'mousedown') {
			e.target.focus();

			if (e.which === 1 && point.line < pp.length)
				sel.start.set(point);
		}
		else if (e.type === 'mouseup' && e.which === 1) {
			if (sel.isDragging) {
				sel.len = i;
				sel.line = sel.start.line;
				sel.channel = sel.start.channel;
				sel.isDragging = false;
				redraw = true;
			}
			else if (point.line === line) {
				this.modeEditChannel = sel.start.channel;
				this.modeEditColumn = sel.start.column;
				redraw = true;
			}
		}
		else if (e.type === 'dblclick' && e.which === 1) {
			sel.len = 0;
			sel.line = point.line;
			sel.channel = point.channel;
			sel.isDragging = false;

			this.modeEditChannel = sel.start.channel;
			this.modeEditColumn = sel.start.column;
			p.currentLine = point.line;
			redraw = true;
		}
		else if (e.type === 'mousemove' && e.which === 1 && !point.compare(sel.start)) {
			if (i > 0) {
				sel.len = i;
				sel.line = sel.start.line;
				sel.channel = sel.start.channel;
				sel.isDragging = true;
			}

			if (point.y === (this.settings.tracklistLines - 1))
				obj.moveCurrentline(1, true);

			redraw = true;
		}

		if (redraw) {
			this.updateTracklist();
			this.updatePanelInfo();
		}
	}
}
//---------------------------------------------------------------------------------------
