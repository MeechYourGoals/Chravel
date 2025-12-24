export type PaymentIdentifierType =
  | 'venmo'
  | 'cashapp'
  | 'zelle'
  | 'paypal'
  | 'applepay'
  | 'applecash'
  | 'cash'
  | 'other'
  | (string & {});

function isEmail(value: string): boolean {
  // Intentionally simple (display masking only, not validation).
  return value.includes('@') && value.includes('.') && !value.includes(' ');
}

function isProbablyPhoneNumber(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function maskEmail(email: string): string {
  const [localRaw, domainRaw] = email.split('@');
  const local = localRaw ?? '';
  const domain = domainRaw ?? '';

  const localMasked =
    local.length <= 2
      ? `${local.charAt(0)}•`
      : `${local.charAt(0)}•••${local.charAt(local.length - 1)}`;

  const domainParts = domain.split('.');
  const domainName = domainParts[0] ?? '';
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  const domainMasked =
    domainName.length <= 2
      ? `${domainName.charAt(0)}•`
      : `${domainName.charAt(0)}•••${domainName.charAt(domainName.length - 1)}`;

  return tld ? `${localMasked}@${domainMasked}.${tld}` : `${localMasked}@${domainMasked}`;
}

function maskPhoneNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `••• ••• ••${last4}` : '•••';
}

function maskGeneric(value: string): string {
  if (value.length <= 2) return `${value.charAt(0)}•`;
  if (value.length <= 5) return `${value.slice(0, 1)}•••${value.slice(-1)}`;
  return `${value.slice(0, 2)}•••${value.slice(-2)}`;
}

function maskHandle(value: string, prefix: '@' | '$'): string {
  const raw = value.startsWith(prefix) ? value.slice(1) : value;
  if (!raw) return `${prefix}•`;
  if (raw.length <= 2) return `${prefix}${raw.charAt(0)}•`;
  return `${prefix}${raw.slice(0, 2)}•••${raw.slice(-1)}`;
}

/**
 * Mask a payment identifier for safe display (prevents full handle/email/phone leakage).
 * This is **display-only** masking; do not use it for data storage.
 */
export function maskPaymentIdentifier(
  identifier: string,
  methodType?: PaymentIdentifierType,
): string {
  const trimmed = identifier.trim();
  if (!trimmed) return '—';

  if (isEmail(trimmed)) return maskEmail(trimmed);
  if (isProbablyPhoneNumber(trimmed)) return maskPhoneNumber(trimmed);

  const loweredType = methodType?.toLowerCase();

  if (trimmed.startsWith('@') || loweredType === 'venmo') return maskHandle(trimmed, '@');
  if (trimmed.startsWith('$') || loweredType === 'cashapp') return maskHandle(trimmed, '$');

  // Numeric-ish identifiers (accounts, last4 etc.)
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length >= 8) {
    const last4 = digitsOnly.slice(-4);
    return last4 ? `••••${last4}` : '••••';
  }

  return maskGeneric(trimmed);
}

