declare interface Window {
  [key: string]: any;
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
