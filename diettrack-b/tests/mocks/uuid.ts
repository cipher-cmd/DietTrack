// Make sure Jest maps 'uuid' to this file via jest.config.js moduleNameMapper
export const v4 = () => '00000000-0000-0000-0000-000000000000';

// Simple UUIDv4-ish validator so routes that call uuid.validate() work in tests
export const validate = (s: string) => {
  // basic pattern check; good enough for tests
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s)
  );
};
