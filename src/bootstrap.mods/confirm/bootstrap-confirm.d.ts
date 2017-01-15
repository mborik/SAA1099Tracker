// Type definitions for Bootstrap Confirm
// Definitions by: Copyright 2017 Martin Bórik <mborik@users.sourceforge.net>

/// <reference types="jquery" />

interface ConfirmDialogButtonDefinition {
    /**
     * Button identifier.
     */
    id: string;

    /**
     * Button caption.
     */
    caption: string;

    /**
     * Addition CSS style class for button.
     */
    style?: string;

    /**
     * Default focused or preselected button.
     */
    default?: boolean;

    /**
     * Flag for button which will be returned after dialog exit.
     */
    cancel?: boolean;
}

/**
 * ConfirmDialogOptions. All options are optional
 */
interface ConfirmDialogOptions {
    /**
     * Dialog title.
     */
    title?: string;

    /**
     * Dialog text content.
     */
    text?: string;

    /**
     * Buttons predefined constant or array of button definition objects.
     */
    buttons?: string | ConfirmDialogButtonDefinition[];

    /**
     * Callback .
     */
    callback?: (id: string, order: number, obj?: any) => void;

    /**
     * Additional CSS style class for the dialog.
     */
    class?: string;

    /**
     * Additional CSS style class for the dialog.
     */
    style?: string;
}

interface JQuery {
    /**
     * Initialize confirm dialog
     */
    confirm(): JQuery;

    /**
     * Inialize confirm dialog with options
     * @param options a ConfirmDialogOptions object with one or more options
     */
    confirm(options: ConfirmDialogOptions): JQuery;
}
