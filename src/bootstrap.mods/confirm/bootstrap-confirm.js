/**
 * Confirm dialog based on Bootstrap modal dialog
 * - some predefined confirm button groups: "okcancel", "yesno"
 * - customizable buttons to own group with names, styles and callbacks for each
 * - global callback which returns button ID or its number in sequence
 *
 * Copyright 2015 Martin Bórik
 * Licensed under the MIT license
 */

(function($) {
	'use strict';

	$.fn.confirm = function(options) {
		var modal = this,
			opts = $.extend({}, $.fn.confirm.defaults, options),
			predefs = $.fn.confirm.predefinedButtonGroups,
			buttons = opts.buttons,
			modalStyle = opts.style || opts.class,
			modalContent = this.find('.modal-content'),
			modalTitle = modalContent.find('.modal-title'),
			modalBody = modalContent.find('.modal-body'),
			modalFooter = modalContent.find('.modal-footer').empty(),
			btnDefault = -1, btnCancel = -1;

		modal.on('show.bs.modal', function(e) {
			if (typeof modalStyle === 'string')
				modalContent.addClass(modalStyle);

			modalTitle.text(opts.title);

			if (opts.html) {
				modalBody.html(opts.html);
			}
			else if (opts.text) {
				modalBody.text(opts.text);
			}

			// convert buttons group identifier to predefined button group array...
			if (typeof buttons === 'string')
				buttons = (predefs[buttons] || predefs['ok']);

			$.each(buttons, function(i) {
				if (this.default)
					btnDefault = i;
				if (this.cancel)
					btnCancel = i;
			});

			if (btnDefault < 0)
				btnDefault = 0;
			if (btnCancel < 0)
				btnCancel = buttons.length - 1;

			if (modalFooter.length) {
				$.each(buttons, function (i, btn) {
					var el = $('<button type="button"/>'),
						btnStyle = btn.style || btn.class || 'btn-default',
						caption = btn.caption || btn.text,
						btnText = (caption || (btn.id && $.camelCase('-' + btn.id)) || 'Button'),
						data = {
							order: i,
							id: (btn.id || (caption && caption.toLowerCase()) || ('btn' + i))
						};

					if (typeof btn.callback === 'function')
						data.cb = btn.callback;

					// apply button bootstrap style and fill in text content...
					if (btnStyle.indexOf('btn-') < 0)
						btnStyle = 'btn-' + btnStyle;
					el.addClass('btn ' + btnStyle)
						.text(btnText)
						.attr('tabindex', i + 1001);

					el.appendTo(modalFooter).click(function(e) {
						modal.result = data;
						modal.modal('hide', e);
					});

					if (btnCancel === i)
						modal.result = data;
				});
			}
		}).on('shown.bs.modal', function() {
			$(this)
				.find('.modal-footer')
				.contents()
				.eq(btnDefault)
				.focus();

		}).on('hide.bs.modal', function() {
			var o = modal.result || { id: 'none' };
			delete modal.result;

			if (o.cb)
				o.cb(o.id, o.order, o);
			opts.callback(o.id, o.order, o);

			modal.off('show.bs.modal shown.bs.modal hide.bs.modal');

			if (typeof modalStyle === 'string')
				modalContent.removeClass(modalStyle);

			modalTitle.empty();
			modalBody.empty();
			modalFooter.empty();
		}).modal({
			show: true,
			backdrop: 'static'
		});

		return this;
	};

	$.fn.confirm.defaults = {
		title: 'Question...',
		buttons: 'yesno',
		callback: function(){}
	};

	$.fn.confirm.predefinedButtonGroups = {
		'ok': [{ id: 'ok', caption: 'OK' }],
		'yesno': [
			{ id: 'yes', caption: 'Yes' },
			{ id: 'no', caption: 'No' }
		],
		'okcancel': [
			{ id: 'ok', caption: 'OK', style: 'btn-primary' },
			{ id: 'cancel', caption: 'Cancel' }
		]
	};
})(jQuery);
