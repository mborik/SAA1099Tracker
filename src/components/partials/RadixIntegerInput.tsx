/*!
 * Forked from @blueprintjs/core/src/components/forms/NumericInput
 * Modified to exclusively integer numeric input field with optional radix.
 *
 * Copyright 2017 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//---------------------------------------------------------------------------------------

import classNames from 'classnames';
import * as React from 'react';
import {
	AbstractPureComponent2,
	Button,
	ButtonGroup,
	Classes,
	ControlGroup,
	DISPLAYNAME_PREFIX,
	HTMLInputProps,
	IconName,
	IIntentProps,
	InputGroup,
	Intent,
	IProps,
	Keys,
	MaybeElement,
	Position,
	removeNonHTMLProps
} from '@blueprintjs/core';
import * as Errors from '@blueprintjs/core/src/common/errors';

import { debounce } from 'typescript-debounce-decorator';
import { clamp } from 'lodash';


export interface IRadixIntegerInputProps extends IIntentProps, IProps {
	/** The position of the buttons with respect to the input field. */
	buttonPosition?: typeof Position.LEFT | typeof Position.RIGHT | 'none';

	/**Sets the default value of the input. */
	defaultValue?: number;

	/** Whether the input is non-interactive. */
	disabled?: boolean;

	/** Whether the numeric input should take up the full width of its container. */
	fill?: boolean;

	/** Ref handler that receives HTML `<input>` element backing this component. */
	inputRef?: (ref: HTMLInputElement | null) => any;

	/** Input will display with larger styling. */
	large?: boolean;

	/** Element to render on the left side of input. */
	leftIcon?: IconName | MaybeElement;

	/** The increment between successive values when <kbd>shift</kbd> is held. */
	majorStepSize?: number | null;

	/** The maximum value of the input. */
	max?: number;

	/** The minimum value of the input. */
	min?: number;

	/** The placeholder text in the absence of any value. */
	placeholder?: string;

	/** Integer value base radix. */
	radix?: number | null;

	/** Element to render on right side of input. */
	rightElement?: JSX.Element;

	/** The increment between successive values when no modifier keys are held. */
	stepSize?: number;

	/** The value to display in the input field. */
	value?: number;

	/** Integer values with higher radixes will be uppercased. */
	uppercase?: boolean;

	/** The callback invoked when the value changes due to typing, arrow keys, or button clicks. */
	onValueChange?(valueAsNumber: number, valueAsString: string, inputElement: HTMLInputElement | null): void;
}

export interface IRadixIntegerInputState {
	currentImeInputInvalid: boolean;
	prevMinProp?: number;
	prevMaxProp?: number;
	value: string;
}

enum IncrementDirection {
	DOWN = -1,
	UP = +1,
}

const NON_HTML_PROPS: Array<keyof IRadixIntegerInputProps> = [
	'buttonPosition',
	'className',
	'defaultValue',
	'majorStepSize',
	'onValueChange',
	'radix',
	'stepSize',
	'uppercase'
];

type ButtonEventHandlers = Required<Pick<React.HTMLAttributes<Element>, 'onKeyDown' | 'onMouseDown'>>;

export default class RadixIntegerInput extends AbstractPureComponent2<HTMLInputProps & IRadixIntegerInputProps, IRadixIntegerInputState> {
	public static displayName = `${DISPLAYNAME_PREFIX}.RadixIntegerInput`;

	public static defaultProps: IRadixIntegerInputProps = {
		buttonPosition: Position.RIGHT,
		defaultValue: 0,
		large: false,
		majorStepSize: 10,
		radix: 10,
		stepSize: 1,
		uppercase: true
	};

	public static getDerivedStateFromProps(props: IRadixIntegerInputProps, state: IRadixIntegerInputState) {
		const nextState = {
			prevMaxProp: props.max,
			prevMinProp: props.min,
		};

		const didMinChange = props.min !== state.prevMinProp;
		const didMaxChange = props.max !== state.prevMaxProp;
		const didBoundsChange = didMinChange || didMaxChange;

		const { min, max, radix, uppercase } = props;

		let value = state.value || '';
		if (props.value != null) {
			value = props.value.toString(radix || 10);

			if (uppercase) {
				value = value.toUpperCase();
			}
		}

		const sanitizedValue = value !== '' ?
			RadixIntegerInput.fixValue(value, radix || 10, min, max, uppercase) : '';

		// if a new min and max were provided that cause the existing value to fall
		// outside of the new bounds, then clamp the value to the new valid range.
		if (didBoundsChange && sanitizedValue !== state.value) {
			return { ...nextState, value: sanitizedValue };
		}

		return { ...nextState, value };
	}

	private static CONTINUOUS_CHANGE_DELAY = 300;
	private static CONTINUOUS_CHANGE_INTERVAL = 100;

	private static fixValue(
		value: string,
		radix: number = 10,
		min: number | undefined,
		max: number | undefined,
		uppercase: boolean = false,
		delta = 0,
	) {
		let result = delta + (parseInt(value, radix) || 0);
		if (min !== undefined && max !== undefined) {
			result = clamp(result, min, max);
		}

		const radixString = result.toString(radix);
		return uppercase ? radixString.toUpperCase() : radixString;
	}

	public state: IRadixIntegerInputState = {
		currentImeInputInvalid: false,
		value: (this.props.value ?? this.props.defaultValue)?.toString() || '',
	};

	// updating these flags need not trigger re-renders, so don't include them in this.state.
	private didPasteEventJustOccur = false;
	private delta = 0;
	private inputElement: HTMLInputElement | null = null;
	private intervalId?: number;

	private incrementButtonHandlers = this.getButtonEventHandlers(IncrementDirection.UP);
	private decrementButtonHandlers = this.getButtonEventHandlers(IncrementDirection.DOWN);

	public render() {
		const { buttonPosition, className, fill, large } = this.props;
		const containerClasses = classNames(Classes.NUMERIC_INPUT, { [Classes.LARGE]: large }, className);
		const buttons = this.renderButtons();

		return (
			<ControlGroup className={containerClasses} fill={fill}>
				{buttonPosition === Position.LEFT && buttons}
				{this.renderInput()}
				{buttonPosition === Position.RIGHT && buttons}
			</ControlGroup>
		);
	}

	public componentDidUpdate(prevProps: IRadixIntegerInputProps, prevState: IRadixIntegerInputState) {
		super.componentDidUpdate(prevProps, prevState);

		const didMinChange = this.props.min !== prevProps.min;
		const didMaxChange = this.props.max !== prevProps.max;
		const didBoundsChange = didMinChange || didMaxChange;

		if (didBoundsChange && this.state.value !== prevState.value) {
			const { min, max, radix, uppercase } = prevProps;

			const valueAsString = RadixIntegerInput.fixValue(this.state.value, radix || 10, min, max, uppercase);
			this.handleNextValue(valueAsString, true);
		}
	}

	protected validateProps(nextProps: HTMLInputProps & IRadixIntegerInputProps) {
		const { majorStepSize, max, min, radix, stepSize, value } = nextProps;
		if (min != null && max != null && min > max) {
			throw new Error(Errors.NUMERIC_INPUT_MIN_MAX);
		}
		if (stepSize! <= 0) {
			throw new Error(Errors.NUMERIC_INPUT_STEP_SIZE_NON_POSITIVE);
		}
		if (radix && (radix < 1 || radix > 36)) {
			throw new Error('<RadixIntegerInput> requires radix to be in range 2..36.');
		}
		if (majorStepSize && majorStepSize <= 0) {
			throw new Error(Errors.NUMERIC_INPUT_MAJOR_STEP_SIZE_NON_POSITIVE);
		}
		if (majorStepSize && majorStepSize < stepSize!) {
			throw new Error(Errors.NUMERIC_INPUT_MAJOR_STEP_SIZE_BOUND);
		}

		if (value != null) {
			const valueAsString = value.toString(radix || 10);
			const sanitizedValue = RadixIntegerInput.fixValue(valueAsString, radix || 10, min, max, false);

			if (sanitizedValue !== valueAsString) {
				console.warn(Errors.NUMERIC_INPUT_CONTROLLED_VALUE_INVALID);
			}
		}
	}

	// Render Helpers
	// ==============

	private renderButtons() {
		const { intent, max, min, radix } = this.props;
		const { value } = this.state;
		const disabled = this.props.disabled || this.props.readOnly;
		const isIncrementDisabled = max !== undefined && value !== '' && parseInt(value, radix || 10) >= max;
		const isDecrementDisabled = min !== undefined && value !== '' && parseInt(value, radix || 10) <= min;

		return (
			<ButtonGroup className={Classes.FIXED} key="button-group" vertical={true}>
				<Button
					disabled={disabled || isIncrementDisabled}
					icon="chevron-up"
					intent={intent}
					{...this.incrementButtonHandlers}
				/>
				<Button
					disabled={disabled || isDecrementDisabled}
					icon="chevron-down"
					intent={intent}
					{...this.decrementButtonHandlers}
				/>
			</ButtonGroup>
		);
	}

	private renderInput() {
		const inputGroupHtmlProps = removeNonHTMLProps(this.props, NON_HTML_PROPS, true);

		return (
			<InputGroup
				autoComplete="off"
				{...inputGroupHtmlProps}
				intent={this.state.currentImeInputInvalid ? Intent.DANGER : this.props.intent}
				inputRef={this.inputRef}
				large={this.props.large}
				leftIcon={this.props.leftIcon}
				onFocus={this.handleInputFocus}
				onBlur={this.handleInputBlur}
				onChange={this.handleInputChange}
				onCompositionEnd={this.handleCompositionEnd}
				onCompositionUpdate={this.handleCompositionUpdate}
				onKeyDown={this.handleInputKeyDown}
				onKeyPress={this.handleInputKeyPress}
				onPaste={this.handleInputPaste}
				onWheel={this.handleWheelChange}
				rightElement={this.props.rightElement}
				value={this.state.value}
			/>
		);
	}

	private inputRef = (input: HTMLInputElement | null) => {
		this.inputElement = input;
		this.props.inputRef?.(input);
	};

	// Callbacks - Buttons
	// ===================

	private getButtonEventHandlers(direction: IncrementDirection): ButtonEventHandlers {
		return {
			// keydown is fired repeatedly when held so it's implicitly continuous
			onKeyDown: evt => {
				if (!this.props.disabled && Keys.isKeyboardClick(evt.keyCode)) {
					this.handleButtonClick(evt, direction);
				}
			},
			onMouseDown: evt => {
				if (!this.props.disabled) {
					this.handleButtonClick(evt, direction);
					this.startContinuousChange();
				}
			},
		};
	}

	private handleButtonClick = (e: React.MouseEvent | React.KeyboardEvent, direction: IncrementDirection) => {
		const delta = this.updateDelta(direction, e);
		this.incrementValue(delta);
	};

	private startContinuousChange() {
		// The button's onMouseUp event handler doesn't fire if the user
		// releases outside of the button, so we need to watch all the way
		// from the top.
		document.addEventListener('mouseup', this.stopContinuousChange);

		// Initial delay is slightly longer to prevent the user from
		// accidentally triggering the continuous increment/decrement.
		this.setTimeout(() => {
			this.intervalId = window.setInterval(this.handleContinuousChange, RadixIntegerInput.CONTINUOUS_CHANGE_INTERVAL);
		}, RadixIntegerInput.CONTINUOUS_CHANGE_DELAY);
	}

	private stopContinuousChange = () => {
		this.delta = 0;
		this.clearTimeouts();
		clearInterval(this.intervalId);
		document.removeEventListener('mouseup', this.stopContinuousChange);
	};

	private handleContinuousChange = () => {
		let { min, max } = this.props;

		if (min !== undefined || max !== undefined) {
			min = min ?? -Infinity;
			max = max ?? Infinity;

			const num = parseInt(this.state.value, this.props.radix || 10);

			if (num <= min || num >= max) {
				this.stopContinuousChange();
				return;
			}
		}
	};

	// Callbacks - Input
	// =================

	private handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		this.props.onFocus?.(e);
	};

	private handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const { value } = e.target as HTMLInputElement;
		this.handleNextValue(this.roundAndClampValue(value));

		this.props.onBlur?.(e);
	};

	private handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (this.props.disabled || this.props.readOnly) {
			return;
		}

		const { keyCode } = e;

		let direction: IncrementDirection | undefined;

		if (keyCode === Keys.ARROW_UP) {
			direction = IncrementDirection.UP;
		} else if (keyCode === Keys.ARROW_DOWN) {
			direction = IncrementDirection.DOWN;
		}

		if (direction !== undefined) {
			// when the input field has focus, some key combinations will modify
			// the field's selection range. we'll actually want to select all
			// text in the field after we modify the value on the following
			// lines. preventing the default selection behavior lets us do that
			// without interference.
			e.preventDefault();

			const delta = this.updateDelta(direction, e);
			this.incrementValue(delta);
		}

		this.props.onKeyDown?.(e);
	};

	private handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
		this.handleNextValue(this.sanitizeRadixIntegerInput(e.data));
		this.setState({ currentImeInputInvalid: false });
	};

	private handleCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
		const { data } = e;
		const sanitizedValue = this.sanitizeRadixIntegerInput(data);

		this.setState({ currentImeInputInvalid: (sanitizedValue.length === 0 && data.length > 0) });
	};

	private handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!this.isValidNumericKeyboardEvent(e)) {
			e.preventDefault();
		}

		this.props.onKeyPress?.(e);
	};

	private handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		this.didPasteEventJustOccur = true;
		this.props.onPaste?.(e);
	};

	private handleInputChange = (e: React.FormEvent) => {
		const { value } = e.target as HTMLInputElement;

		let nextValue = value;
		if (this.didPasteEventJustOccur) {
			this.didPasteEventJustOccur = false;
			nextValue = this.sanitizeRadixIntegerInput(value);
		}

		this.handleNextValue(nextValue);
	};

	@debounce(16, { leading: true })
	private handleWheelChange = (e: React.WheelEvent) => {
		let delta = 0;
		if (e.deltaY > 0) {
			delta = -1;
		} else if (e.deltaY < 0) {
			delta = 1;
		}

		if (delta) {
			this.incrementValue(delta);
		}
	}

	// Data logic
	// ==========

	private handleNextValue(valueAsString: string, force: boolean = false) {
		if (this.props.value == null || force) {
			this.setState({ value: valueAsString });
		}

		const valueAsNumber = parseInt(valueAsString, this.props.radix || 10);
		this.props.onValueChange?.(valueAsNumber, valueAsString, this.inputElement);
	}

	private incrementValue(delta: number) {
		const currValue = this.state.value === '' ? '0' : this.state.value;
		const nextValue = this.roundAndClampValue(currValue, delta);

		if (nextValue !== this.state.value) {
			this.handleNextValue(nextValue);
		}

		// return value used in continuous change updates
		return nextValue;
	}

	private getIncrementDelta(direction: IncrementDirection, isShiftKeyPressed: boolean) {
		const { majorStepSize, radix, stepSize } = this.props;

		if (isShiftKeyPressed) {
			return direction * (majorStepSize || radix || 10);
		} else {
			return direction * stepSize!;
		}
	}

	private roundAndClampValue(value: string, delta = 0) {
		const { min, max, radix, uppercase } = this.props;

		return RadixIntegerInput.fixValue(value, radix || 10, min, max, uppercase, delta);
	}

	private updateDelta(direction: IncrementDirection, e: React.MouseEvent | React.KeyboardEvent) {
		this.delta = this.getIncrementDelta(direction, e.shiftKey);
		return this.delta;
	}

	private isValidNumericKeyboardEvent(e: React.KeyboardEvent) {
		if (e.key == null) {
			return true;
		}

		// allow modified key strokes that may involve characters
		if (e.ctrlKey || e.altKey || e.metaKey) {
			return true;
		}

		// keys that print a single character
		if (e.key.length !== 1) {
			return true;
		}

		return /^[0-9a-z]$/i.test(e.key);
	}

	private sanitizeRadixIntegerInput(value: string) {
		const valueChars = value.replace(/[\uFF10-\uFF19]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xfee0));
		return valueChars.replace(/[^0-9a-z]+/ig, '');
	}
}
