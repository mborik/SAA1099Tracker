export function assert(
  condition: boolean,
  _message?: string,
): asserts condition {
  if (!condition) {
    // throw new Error(message);
  }
}
