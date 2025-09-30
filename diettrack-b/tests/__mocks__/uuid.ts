// Minimal uuid mock to avoid ESM parsing issues in Jest (CJS)
// Provide both named and default export to be safe.

export const v4 = () => '00000000-0000-0000-0000-000000000000';

export default { v4 };
