/*
 * PMD 85 ColorAce picture editor
 * Copyright (c) 2019 Martin Bórik
 */

import { IToastProps, Position, Toaster } from "@blueprintjs/core";
import { NavbarAction, NavbarReducerAction } from "./navbar";


const toast = Toaster.create({
	canEscapeKeyClear: false,
	position: Position.BOTTOM,
});

export const showToast = (opt: IToastProps) => {
	toast.clear();
	toast.show(opt);
};

export const actionToast = (toastParams: IToastProps): NavbarReducerAction => ({
	type: NavbarAction.Toast,
	payload: {
		intent: 'warning',
		icon: 'warning-sign',
		message: 'something happen!?',
		...toastParams
	}
});
