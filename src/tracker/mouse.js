/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.handleMouseEvent = function (part, obj, e) {
	var x = e.pageX || 0, y = e.pageY || 0;
	var leftButton = browser.isFirefox
			? (!!(e.buttons & 1) || (e.type !== 'mousemove' && e.button === 0))
			: (e.which === 1);

	if (part === 'tracklist') {
		var redraw = false,
			p = this.player,
			pp = p.position[p.currentPosition],
			sel = obj.selection,
			offset = obj.canvasData.offset,
			point = obj.pointToTracklist(x - offset.left, y - offset.top),
			line = p.currentLine, i;

		if (this.modePlay || !pp)
			return;

		if (point) {
			point.line = Math.min(point.line, pp.length - 1);
			i = point.line - sel.start.line;
		}
		else if (e.type !== 'mousewheel')
			return;

		if (e.type === 'mousewheel') {
			if (document.activeElement !== e.target)
				document.activeElement.blur();

			if (e.delta < 0)
				obj.moveCurrentline(1);
			else if (e.delta > 0)
				obj.moveCurrentline(-1);
			redraw = true;
		}
		else if (e.type === 'mousedown') {
			if (leftButton && point.line < pp.length)
				sel.start.set(point);
		}
		else if (e.type === 'mouseup' && leftButton) {
			if (sel.isDragging) {
				sel.len = i;
				sel.line = sel.start.line;
				sel.channel = sel.start.channel;
				sel.isDragging = false;
				redraw = true;
			}
			else {
				if (!this.modeEdit)
					e.target.focus();

				if (point.line === line) {
					this.modeEditChannel = sel.start.channel;
					this.modeEditColumn = sel.start.column;
					redraw = true;
				}
			}
		}
		else if (e.type === 'dblclick' && leftButton) {
			sel.len = 0;
			sel.line = point.line;
			sel.channel = point.channel;
			sel.isDragging = false;

			if (!this.modeEdit)
				e.target.focus();

			this.modeEditChannel = sel.start.channel;
			this.modeEditColumn = sel.start.column;
			p.currentLine = point.line;
			redraw = true;
		}
		else if (e.type === 'mousemove' && leftButton && !point.compare(sel.start)) {
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
			if (!sel.isDragging && e.type !== 'mousewheel') {
				i = 0;
				if (this.modeEditColumn >= 5)
					i = p.pattern[pp.ch[this.modeEditChannel].pattern].data[line].cmd;

				this.doc.showTracklistStatus(this.modeEditColumn, i);
			}

			this.updateTracklist();
			this.updatePanelInfo();
		}
	}
	else {
		var sample = this.player.sample[this.workingSample], data,
			dragging = /mouse(down|move)/.test(e.type),
			update = false,
			redrawAll = false, limitFrom, limitTo;

		x -= (obj.smpeditOffset.left + obj.centering);
		if (x < 0)
			return;

		x = Math.min(0 | (x / obj.columnWidth), 63) + obj.smpeditScroll;
		limitFrom = limitTo = x;
		data = sample.data[x];

		if (part === 'amp') {
			y -= obj.smpeditOffset.top.amp;

			var ampHeight = obj.amp.obj.height - 24,
				ampLeftChn = (y < obj.halfing),
				freqEnableSection = (y > (ampHeight + 3)) || obj.drag.isDragging;

			if (freqEnableSection && leftButton) {
				if (e.type === 'mousedown') {
					i = obj.drag.freqEnableState = !data.enable_freq;
					obj.drag.isDragging = true;
				}
				else if (e.type === 'mouseup') {
					i = obj.drag.freqEnableState;
					obj.drag.isDragging = false;
				}
				else if (obj.drag.isDragging && e.type === 'mousemove')
					i = obj.drag.freqEnableState;

				if (data.enable_freq !== i) {
					data.enable_freq = i;
					update = true;
				}
			}
			else if (e.type === 'mousewheel') {
				i = e.delta / Math.abs(e.delta);

				if (ampLeftChn)
					data.volume.L = Math.max(Math.min(data.volume.L + i, 15), 0);
				else
					data.volume.R = Math.max(Math.min(data.volume.R - i, 15), 0);

				update = true;
			}
			else if (dragging && leftButton) {
				if (ampLeftChn)
					data.volume.L = Math.max(15 - (0 | (y / 9)), 0);
				else
					data.volume.R = Math.max(15 - (0 | ((ampHeight - y) / 9)), 0);

				update = true;
			}
		}
		else if (part === 'noise') {
			y -= obj.smpeditOffset.top.noise;
			i = (0 | data.enable_noise) * (data.noise_value + 1);

			if (e.type === 'mousewheel') {
				i += e.delta / Math.abs(e.delta);
				update = true;
			}
			else if (dragging && leftButton) {
				i = 4 - (0 | (y / 9));
				update = true;
			}

			if (update) {
				i = Math.min(Math.max(i, 0), 4);

				data.enable_noise = !!i;
				data.noise_value = Math.max(--i, 0);
			}
		}
		else if (part === 'range' && leftButton) {
			if (e.type === 'mouseup') {
				obj.drag.isDragging = false;
				update = true;
			}
			else if (e.type === 'mousedown') {
				obj.drag.isDragging = 1;
				obj.drag.rangeStart = x;
				update = true;
			}
			else if (obj.drag.isDragging && e.type === 'mousemove') {
				obj.drag.isDragging = 2;
				update = true;
			}

			if (update) {
				if (x === obj.drag.rangeStart) {
					if (obj.drag.isDragging === 2) {
						sample.end = x + 1;
						sample.loop = x;
					}
					else if (obj.drag.isDragging === 1) {
						sample.end = ++x;
						sample.loop = x;
					}
				}
				else if (x > obj.drag.rangeStart) {
					sample.end = ++x;
					sample.loop = obj.drag.rangeStart;
				}
				else {
					sample.end = obj.drag.rangeStart + 1;
					sample.loop = x;
				}

				redrawAll = true;

				if (obj.drag.isDragging === 1)
					limitFrom = limitTo = void 0;
				else {
					limitFrom = sample.loop - 1;
					limitTo = sample.end;
				}
			}
		}

		if (update)
			this.updateSampleEditor(redrawAll, limitFrom, limitTo);
	}
};
//---------------------------------------------------------------------------------------
