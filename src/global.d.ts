declare interface Window {
  electron: any;
}
//---------------------------------------------------------------------------------------
declare interface JQueryEventObject {
  buttons: number;
  delta: number;
  target: HTMLElement;
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

