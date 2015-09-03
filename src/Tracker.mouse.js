/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.handleMouseEvent = function (part, obj, e) {
    if (part === 'tracklist') {
        var redraw = false,
            p = this.player,
            sel = this.selectionPoint,
            pp = p.position[p.currentPosition],
            offset = obj.canvasData.offset,
            point = obj.pointToTracklist(e.pageX - offset.left, e.pageY - offset.top),
            line = p.currentLine,
            type = e.type, i;

        if (this.modePlay || !pp || !point)
            return;

        point.line = Math.min(point.line, pp.length - 1);

        if (type === 'mousewheel') {
			e.target.focus();

			if (e.delta < 0)
				obj.moveCurrentline(1);
			else if (e.delta > 0)
				obj.moveCurrentline(-1);
			redraw = true;
        }
        else if (type === 'mousedown') {
            e.target.focus();

            if (e.which === 1 && point.line < pp.length)
                sel.set(point);
        }
        else if (type === 'mouseup' && e.which === 1) {
            if (this.selectionStarted) {
                this.selectionLine = sel.line;
                this.selectionChannel = sel.channel;
                this.selectionLen = point.line - sel.line;
                this.selectionStarted = false;
                redraw = true;
            }
            else if (point.line === line) {
                this.modeEditChannel = sel.channel;
                this.modeEditColumn = sel.column;
                redraw = true;
            }
        }
        else if (type === 'dblclick' && e.which === 1) {
            this.selectionLine = point.line;
            this.selectionChannel = point.channel;
            this.selectionLen = 0;
            this.selectionStarted = false;
            this.modeEditChannel = sel.channel;
            this.modeEditColumn = sel.column;
            p.currentLine = point.line;
            redraw = true;
        }
        else if (/mouse(move|out)/.test(type) && e.which === 1 && !sel.compare(point)) {
            i = point.line - sel.line;

            if (i > 0) {
                this.selectionLine = sel.line;
                this.selectionChannel = sel.channel;
                this.selectionLen = i;
                this.selectionStarted = true;
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
