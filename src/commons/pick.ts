/**
 * SAA1099Tracker: Lodash pick modern replacement.
 * Copyright (c) 2019 Konstantin Vyatkin <tino@vtkn.io>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------
/**
 * Creates an object composed of the picked `object` properties.
 *
 * @category Object
 * @param object The source object.
 * @param [props] The property names to pick, specified
 *  individually or in arrays.
 * @returns Returns the new object.
 */
export function pick<T extends object, U extends keyof T>(
  object: T,
  props: readonly U[],
): Pick<T, U>;

export function pick<T extends unknown[]>(
  array: T,
  indexes: readonly number[],
): T;

export function pick(
  objectOrArray: Record<PropertyKey, unknown> | readonly unknown[],
  props: readonly PropertyKey[],
) {
  if (!objectOrArray) {
    return objectOrArray;
  }
  if (typeof props?.some !== 'function') {
    return objectOrArray;
  }

  if (objectOrArray instanceof Array) {
    return props
      .filter((i): i is number => {
        if (typeof i !== 'number' || !Number.isInteger(i)) {
          throw new TypeError(
            `Expected array of integer, got ${String( i )}`,
          );
        }
        return Math.abs(i) <= objectOrArray.length;
      })
      .map(i => objectOrArray[i < 0 ? objectOrArray.length + i : i]);
  }

  if (typeof objectOrArray !== 'object') {
    return objectOrArray;
  }
  const entries: [string | symbol, unknown][] = Object.entries(objectOrArray);
  if (props.some(property => typeof property === 'symbol')) {
    const symbolProps: [symbol, unknown][] = Object.getOwnPropertySymbols(
      objectOrArray,
    ).map(symbol => [symbol, objectOrArray[symbol]]);
    entries.push(...symbolProps);
  }
  const properties = new Set(props);
  if (properties.size === 0) {
    return {};
  }
  return Object.fromEntries(
    entries.filter(([property]) => properties.has(property)),
  );
}
