import crypto from 'crypto';

/** Generate a SHA-256 hash (16 hex chars) from a base64 data URL. */
export function hashBase64Image(base64Image: string): string {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    return crypto
      .createHash('sha256')
      .update(cleanBase64)
      .digest('hex')
      .slice(0, 16);
  } catch (error) {
    console.error('[IMAGE HASH ERROR]', error);
    return crypto.randomBytes(8).toString('hex');
  }
}

/** Validate data:image;base64,... format (accepts tiny images). */
export function validateBase64Image(base64String: string): boolean {
  try {
    const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
    if (!dataUrlRegex.test(base64String)) return false;
    const base64Data = base64String.split(',')[1];
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Data) && base64Data.length > 0;
  } catch {
    return false;
  }
}
