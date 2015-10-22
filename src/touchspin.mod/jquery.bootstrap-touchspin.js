/**
 * Bootstrap TouchSpin v1.0.0 (http://www.virtuosoft.eu/code/bootstrap-touchspin/)
 * - Mobile and touch friendly input spinner component for Bootstrap 3.
 * - Modified and customized for SAA1099Tracker project by Martin Bórik.
 *
 * Copyright 2013 István Ujj-Mészáros
 * Licensed under the Apache License 2.0
 */

(function($) {
	'use strict';

	var _currentSpinnerId = 0;

	function _scopedEventName(name, id) {
		return name + '.touchspin_' + id;
	}

	function _scopeEventNames(names, id) {
		return $.map(names, function(name) {
			return _scopedEventName(name, id);
		});
	}

	function _toWidth(a, w) {
		if (typeof a !== 'string')
			a = '' + (a.valueOf() >> 0);
		return ('0000000000' + a).substr(-Math.max(w || 0, a.length));
	}

	$.fn.TouchSpin = function(options) {
		if (options === 'destroy') {
			this.each(function() {
				var originalinput = $(this),
					originalinput_data = originalinput.data();
				$(document).off(_scopeEventNames([
					'mouseup',
					'touchend',
					'touchcancel',
					'mousemove',
					'touchmove',
					'scroll',
					'scrollstart'], originalinput_data.spinnerid).join(' '));
			});

			return;
		}

		var defaults = {
			min: 0,
			max: 100,
			initval: '',
			step: 1,
			radix: 10,
			decimals: undefined,
			fixedwidth: 0,
			stepinterval: 100,
			forcestepdivisibility: 'none', // none | floor | round | ceil
			stepintervaldelay: 500,
			verticalbuttons: true,
			verticalupclass: 'glyphicon glyphicon-chevron-up',
			verticaldownclass: 'glyphicon glyphicon-chevron-down',
			prefix: '',
			postfix: '',
			prefix_extraclass: '',
			postfix_extraclass: '',
			booster: true,
			boostat: 10,
			maxboostedstep: false,
			mousewheel: true,
			buttondown_class: 'btn btn-default',
			buttonup_class: 'btn btn-default'
		};

		var attributeMap = {
			min: 'min',
			max: 'max',
			initval: 'init-val',
			step: 'step',
			radix: 'radix',
			decimals: 'decimals',
			fixedwidth: 'fixedwidth',
			stepinterval: 'step-interval',
			verticalbuttons: 'vertical-buttons',
			verticalupclass: 'vertical-up-class',
			verticaldownclass: 'vertical-down-class',
			forcestepdivisibility: 'force-step-divisibility',
			stepintervaldelay: 'step-interval-delay',
			prefix: 'prefix',
			postfix: 'postfix',
			prefix_extraclass: 'prefix-extra-class',
			postfix_extraclass: 'postfix-extra-class',
			booster: 'booster',
			boostat: 'boostat',
			maxboostedstep: 'max-boosted-step',
			mousewheel: 'mouse-wheel',
			buttondown_class: 'button-down-class',
			buttonup_class: 'button-up-class'
		};

		return this.each(function() {

			var settings,
				originalinput = $(this),
				originalinput_data = originalinput.data(),
				container,
				elements,
				value,
				downSpinTimer,
				upSpinTimer,
				downDelayTimeout,
				upDelayTimeout,
				spincount = 0,
				spinning = false;

			init();


			function init() {
				if (originalinput.data('alreadyinitialized'))
					return;

				originalinput.data('alreadyinitialized', true);
				_currentSpinnerId++;
				originalinput.data('spinnerid', _currentSpinnerId);

				if (!originalinput.is('input')) {
					console.log('Must be an input.');
					return;
				}

				_initSettings();
				_setInitval();
				_checkValue();
				_buildHtml();
				_initElements();
				_hideEmptyPrefixPostfix();
				_bindEvents();
				_bindEventsInterface();

				elements.input.css('display', 'block');
			}

			function _fixValue(value) {
				value = Number(value) || 0;
				if (settings.decimals >= 0)
					value = value.toFixed(settings.decimals);
				else if (settings.radix !== 10)
					value = value.toString(settings.radix).toUpperCase();
				if (settings.fixedwidth)
					value = _toWidth(value, settings.fixedwidth);

				return value;
			}

			function _setInitval() {
				if (settings.initval !== '' && originalinput.val() === '')
					originalinput.val(_fixValue(settings.initval));
			}

			function changeSettings(newsettings) {
				_updateSettings(newsettings);
				_checkValue();

				var value = elements.input.val();
				if (value !== '')
					elements.input.val(_fixValue(value));
			}

			function _initSettings() {
				settings = $.extend({}, defaults, originalinput_data, _parseAttributes(), options);
			}

			function _parseAttributes() {
				var data = {};
				$.each(attributeMap, function(key, value) {
					var attrName = 'bts-' + value + '';
					if (originalinput.is('[data-' + attrName + ']'))
						data[key] = originalinput.data(attrName);
				});

				return data;
			}

			function _updateSettings(newsettings) {
				settings = $.extend({}, settings, newsettings);
			}

			function _buildHtml() {
				var initval = originalinput.val(),
					parentelement = originalinput.parent();

				if (initval !== '')
					initval = _fixValue(initval);

				originalinput.data('initvalue', initval).val(initval);
				originalinput.addClass('form-control');

				if (parentelement.hasClass('input-group'))
					_advanceInputGroup(parentelement);
				else
					_buildInputGroup();
			}

			function _advanceInputGroup(parentelement) {
				parentelement.addClass('bootstrap-touchspin');

				var prev = originalinput.prev(),
					next = originalinput.next();

				var downhtml,
					uphtml,
					prefixhtml = '<span class="input-group-addon bootstrap-touchspin-prefix">' + settings.prefix + '</span>',
					postfixhtml = '<span class="input-group-addon bootstrap-touchspin-postfix">' + settings.postfix + '</span>';

				if (prev.hasClass('input-group-btn')) {
					downhtml = '<button class="' + settings.buttondown_class + ' bootstrap-touchspin-down" type="button">-</button>';
					prev.append(downhtml);
				}
				else {
					downhtml = '<span class="input-group-btn"><button class="' + settings.buttondown_class + ' bootstrap-touchspin-down" type="button">-</button></span>';
					$(downhtml).insertBefore(originalinput);
				}

				if (next.hasClass('input-group-btn')) {
					uphtml = '<button class="' + settings.buttonup_class + ' bootstrap-touchspin-up" type="button">+</button>';
					next.prepend(uphtml);
				}
				else {
					uphtml = '<span class="input-group-btn"><button class="' + settings.buttonup_class + ' bootstrap-touchspin-up" type="button">+</button></span>';
					$(uphtml).insertAfter(originalinput);
				}

				$(prefixhtml).insertBefore(originalinput);
				$(postfixhtml).insertAfter(originalinput);

				container = parentelement;
			}

			function _buildInputGroup() {
				var html;

				if (settings.verticalbuttons)
					html = '<div class="input-group bootstrap-touchspin"><span class="input-group-addon bootstrap-touchspin-prefix">' + settings.prefix + '</span><span class="input-group-addon bootstrap-touchspin-postfix">' + settings.postfix + '</span><span class="input-group-btn-vertical"><button class="' + settings.buttondown_class + ' bootstrap-touchspin-up" type="button"><i class="' + settings.verticalupclass + '"></i></button><button class="' + settings.buttonup_class + ' bootstrap-touchspin-down" type="button"><i class="' + settings.verticaldownclass + '"></i></button></span></div>';
				else
					html = '<div class="input-group bootstrap-touchspin"><span class="input-group-btn"><button class="' + settings.buttondown_class + ' bootstrap-touchspin-down" type="button">-</button></span><span class="input-group-addon bootstrap-touchspin-prefix">' + settings.prefix + '</span><span class="input-group-addon bootstrap-touchspin-postfix">' + settings.postfix + '</span><span class="input-group-btn"><button class="' + settings.buttonup_class + ' bootstrap-touchspin-up" type="button">+</button></span></div>';

				container = $(html).insertBefore(originalinput);

				$('.bootstrap-touchspin-prefix', container).after(originalinput);

				if (originalinput.hasClass('input-sm'))
					container.addClass('input-group-sm');
				else if (originalinput.hasClass('input-lg'))
					container.addClass('input-group-lg');
			}

			function _initElements() {
				elements = {
					down: $('.bootstrap-touchspin-down', container),
					up: $('.bootstrap-touchspin-up', container),
					input: $('input', container),
					prefix: $('.bootstrap-touchspin-prefix', container).addClass(settings.prefix_extraclass),
					postfix: $('.bootstrap-touchspin-postfix', container).addClass(settings.postfix_extraclass)
				};
			}

			function _hideEmptyPrefixPostfix() {
				if (settings.prefix === '')
					elements.prefix.hide();
				if (settings.postfix === '')
					elements.postfix.hide();
			}

			function _bindEvents() {
				originalinput.on('keydown', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 38) {
						if (spinning !== 'up') {
							upOnce();
							startUpSpin();
						}
						ev.preventDefault();
					}
					else if (code === 40) {
						if (spinning !== 'down') {
							downOnce();
							startDownSpin();
						}
						ev.preventDefault();
					}
				});

				originalinput.on('keyup', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 38)
						stopSpin();
					else if (code === 40)
						stopSpin();
				});

				originalinput.on('blur', function() {
					_checkValue();
				});

				elements.down.on('keydown', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 32 || code === 13) {
						if (spinning !== 'down') {
							downOnce();
							startDownSpin();
						}
						ev.preventDefault();
					}
				});

				elements.down.on('keyup', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 32 || code === 13)
						stopSpin();
				});

				elements.up.on('keydown', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 32 || code === 13) {
						if (spinning !== 'up') {
							upOnce();
							startUpSpin();
						}
						ev.preventDefault();
					}
				});

				elements.up.on('keyup', function(ev) {
					var code = ev.keyCode || ev.which;

					if (code === 32 || code === 13)
						stopSpin();
				});

				elements.down.on('mousedown.touchspin', function(ev) {
					elements.down.off('touchstart.touchspin');	// android 4 workaround

					if (originalinput.is(':disabled'))
						return;

					downOnce();
					startDownSpin();

					ev.preventDefault();
					ev.stopPropagation();
				});

				elements.down.on('touchstart.touchspin', function(ev) {
					elements.down.off('mousedown.touchspin');	// android 4 workaround

					if (originalinput.is(':disabled'))
						return;

					downOnce();
					startDownSpin();

					ev.preventDefault();
					ev.stopPropagation();
				});

				elements.up.on('mousedown.touchspin', function(ev) {
					elements.up.off('touchstart.touchspin');	// android 4 workaround

					if (originalinput.is(':disabled'))
						return;

					upOnce();
					startUpSpin();

					ev.preventDefault();
					ev.stopPropagation();
				});

				elements.up.on('touchstart.touchspin', function(ev) {
					elements.up.off('mousedown.touchspin');	// android 4 workaround

					if (originalinput.is(':disabled'))
						return;

					upOnce();
					startUpSpin();

					ev.preventDefault();
					ev.stopPropagation();
				});

				elements.up.on('mouseout touchleave touchend touchcancel', function(ev) {
					if (!spinning)
						return;

					ev.stopPropagation();
					stopSpin();
				});

				elements.down.on('mouseout touchleave touchend touchcancel', function(ev) {
					if (!spinning)
						return;

					ev.stopPropagation();
					stopSpin();
				});

				elements.down.on('mousemove touchmove', function(ev) {
					if (!spinning)
						return;

					ev.stopPropagation();
					ev.preventDefault();
				});

				elements.up.on('mousemove touchmove', function(ev) {
					if (!spinning)
						return;

					ev.stopPropagation();
					ev.preventDefault();
				});

				$(document).on(_scopeEventNames(['mouseup', 'touchend', 'touchcancel'], _currentSpinnerId).join(' '), function(ev) {
					if (!spinning)
						return;

					ev.preventDefault();
					stopSpin();
				});

				$(document).on(_scopeEventNames(['mousemove', 'touchmove', 'scroll', 'scrollstart'], _currentSpinnerId).join(' '), function(ev) {
					if (!spinning)
						return;

					ev.preventDefault();
					stopSpin();
				});

				originalinput.on('mousewheel DOMMouseScroll', function(ev) {
					if (!settings.mousewheel)
						return;
					var delta = ev.originalEvent.wheelDelta || -ev.originalEvent.deltaY || -ev.originalEvent.detail;

					ev.stopPropagation();
					ev.preventDefault();

					if (!originalinput.is(':focus'))
						originalinput.focus();
					if (delta < 0)
						downOnce();
					else
						upOnce();
				});
			}

			function _bindEventsInterface() {
				originalinput.on('touchspin.uponce', function() {
					stopSpin();
					upOnce();
				});

				originalinput.on('touchspin.downonce', function() {
					stopSpin();
					downOnce();
				});

				originalinput.on('touchspin.startupspin', function() {
					startUpSpin();
				});

				originalinput.on('touchspin.startdownspin', function() {
					startDownSpin();
				});

				originalinput.on('touchspin.stopspin', function() {
					stopSpin();
				});

				originalinput.on('touchspin.updatesettings', function(e, newsettings) {
					changeSettings(newsettings);
				});
			}

			function _forcestepdivisibility(value) {
				if (!(settings.decimals >= 0))
					return value;
				switch (settings.forcestepdivisibility) {
					case 'round':
						return (Math.round(value / settings.step) * settings.step).toFixed(settings.decimals);
					case 'floor':
						return (Math.floor(value / settings.step) * settings.step).toFixed(settings.decimals);
					case 'ceil':
						return (Math.ceil(value / settings.step) * settings.step).toFixed(settings.decimals);
					default:
						return value;
				}
			}

			function _checkValue() {
				var val, parsedval, returnval;

				val = originalinput.val();
				if (val === '')
					return;

				if (settings.decimals > 0 && val === '.')
					return;

				if (settings.decimals >= 0)
					parsedval = parseFloat(val) || 0;
				else
					parsedval = parseInt(val, settings.radix) || 0;

				returnval = parsedval;
				if (parsedval < settings.min)
					returnval = settings.min;
				if (parsedval > settings.max)
					returnval = settings.max;

				if (settings.decimals >= 0)
					returnval = _forcestepdivisibility(returnval);

				if (parsedval !== returnval) {
					originalinput.val(_fixValue(returnval));
					originalinput.trigger('change');
				}
			}

			function _getBoostedStep() {
				if (!settings.booster)
					return settings.step;
				else {
					var boosted = Math.pow(2, Math.floor(spincount / settings.boostat)) * settings.step;

					if (settings.maxboostedstep && boosted > settings.maxboostedstep) {
						boosted = settings.maxboostedstep;
						value = Math.round((value / boosted)) * boosted;
					}

					return Math.max(settings.step, boosted);
				}
			}

			function upOnce() {
				_checkValue();

				value = elements.input.val();
				if (settings.decimals >= 0)
					value = parseFloat(value) || 0;
				else
					value = parseInt(value, settings.radix) || 0;

				var initvalue = value,
					boostedstep = _getBoostedStep();

				value += boostedstep;
				if (value > settings.max) {
					value = settings.max;
					originalinput.trigger('touchspin.on.max');
					stopSpin();
				}

				elements.input.val(_fixValue(value));

				if (initvalue !== value)
					originalinput.trigger('change');
			}

			function downOnce() {
				_checkValue();

				value = elements.input.val();
				if (settings.decimals >= 0)
					value = parseFloat(value) || 0;
				else
					value = parseInt(value, settings.radix) || 0;

				var initvalue = value,
					boostedstep = _getBoostedStep();

				value -= boostedstep;
				if (value < settings.min) {
					value = settings.min;
					originalinput.trigger('touchspin.on.min');
					stopSpin();
				}

				elements.input.val(_fixValue(value));

				if (initvalue !== value)
					originalinput.trigger('change');
			}

			function startDownSpin() {
				stopSpin();

				spincount = 0;
				spinning = 'down';

				originalinput.trigger('touchspin.on.startspin');
				originalinput.trigger('touchspin.on.startdownspin');

				downDelayTimeout = setTimeout(function() {
					downSpinTimer = setInterval(function() {
						spincount++;
						downOnce();
					}, settings.stepinterval);
				}, settings.stepintervaldelay);
			}

			function startUpSpin() {
				stopSpin();

				spincount = 0;
				spinning = 'up';

				originalinput.trigger('touchspin.on.startspin');
				originalinput.trigger('touchspin.on.startupspin');

				upDelayTimeout = setTimeout(function() {
					upSpinTimer = setInterval(function() {
						spincount++;
						upOnce();
					}, settings.stepinterval);
				}, settings.stepintervaldelay);
			}

			function stopSpin() {
				clearTimeout(downDelayTimeout);
				clearTimeout(upDelayTimeout);
				clearInterval(downSpinTimer);
				clearInterval(upSpinTimer);

				switch (spinning) {
					case 'up':
						originalinput.trigger('touchspin.on.stopupspin');
						originalinput.trigger('touchspin.on.stopspin');
						break;
					case 'down':
						originalinput.trigger('touchspin.on.stopdownspin');
						originalinput.trigger('touchspin.on.stopspin');
						break;
				}

				spincount = 0;
				spinning = false;
			}

		});
	};
})(jQuery);
