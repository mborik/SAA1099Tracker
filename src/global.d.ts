declare interface Window {
  electron?: {
    version: string;
    relaunch: () => void;
    clearCache: () => void;
  };
}
//---------------------------------------------------------------------------------------
declare interface JQueryEventObject {
  buttons: number;
  delta: number;
  target: HTMLElement;
  which: number;
}
declare interface JQueryInputEventTarget extends JQueryInputEventObject {
  currentTarget: HTMLInputElement;
}
//---------------------------------------------------------------------------------------
/**
 * Include `null` to T
 */
declare type Nullable<T> = T | null;
/**
 * Maybe T
 */
declare type Maybe<T> = T | undefined;

