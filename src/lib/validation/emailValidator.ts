/**
 * Strict real email validator for SportSync.
 * Restricts and forbids fake, dummy, disposable, and temporary accounts.
 */

// Known disposable / temporary email domains
const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'grr.la',
  'sharklasers.com',
  '10minutemail.com',
  '10minutemail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'getairmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'generator.email',
  'maildrop.cc',
  'inboxkitten.com',
  'tempail.com',
  'burnermail.io',
  'mohmal.com',
  'crazymailing.com',
  'nada.ltd',
  'getnada.com',
  'emailondeck.com',
  'tempmailaddress.com',
  'mytemp.email',
  'minuteinbox.com',
  'dropmail.me',
  'fakemailgenerator.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spamgourmet.com',
  'mytempemail.com',
  'harakirimail.com',
  'trashmail.org',
  'mailcatch.com',
  'mytempmail.com',
  'tempmail2.com',
  'spambog.com',
  'jetable.org',
  'kasmail.com',
  'trashymail.com',
  'mytempemail.net',
  'disposablemail.com',
  'mailnesia.com',
  'mailnull.com',
  'anonbox.net',
  'incognitomail.org',
  'filzmail.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'spamevader.com',
  'instantemailaddress.com',
  'trashinbox.com',
]);

// Known dummy / fake / test domains
const FAKE_TEST_DOMAINS = new Set<string>([
  'test.com',
  'testing.com',
  'example.com',
  'example.org',
  'example.net',
  'fake.com',
  'fake.org',
  'dummy.com',
  'sample.com',
  'invalid.com',
  'asdf.com',
  'qwerty.com',
  'foo.com',
  'bar.com',
  'baz.com',
  'temp.com',
  'none.com',
  'noemail.com',
  'nowhere.com',
  'test.ph',
  'fake.ph',
  'dummy.ph',
  'sample.ph',
  'domain.com',
  'email.com',
  'myemail.com',
  'localhost',
  'test.test',
  'local.test',
]);

// Known fake or test usernames
const FAKE_USERNAMES = new Set<string>([
  'test',
  'testing',
  'fake',
  'dummy',
  'asdf',
  'qwerty',
  'admin',
  'tester',
  'user',
  'aaa',
  'bbb',
  'ccc',
  '123',
  '123456',
  'noreply',
  'noemail',
  'temp',
  'temporary',
  'sample',
  'random',
  'fakeuser',
  'testuser',
]);

// Invalid / reserved dummy TLDs
const FORBIDDEN_TLDS = new Set<string>([
  'test',
  'example',
  'invalid',
  'localhost',
  'local',
  'fake',
  'dummy',
]);

// Common typo domains mapped to their intended real provider
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmailcom': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.co': 'icloud.com',
};

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
}

/**
 * Validates that an email is legitimate, non-fake, non-disposable, and uses a real domain.
 */
export function validateRealEmail(email: unknown): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required.',
    };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic format check
  if (!trimmed || trimmed.length > 254) {
    return {
      isValid: false,
      error: 'Please enter a valid email address.',
    };
  }

  // Check structure: exactly one '@'
  const atParts = trimmed.split('@');
  if (atParts.length !== 2) {
    return {
      isValid: false,
      error: 'Please enter a valid email address with a single @ symbol.',
    };
  }

  const [localPart, domainPart] = atParts;

  // Local part checks
  if (!localPart || localPart.length > 64) {
    return {
      isValid: false,
      error: 'Email username is invalid or too long.',
    };
  }

  // Disallow leading, trailing, or consecutive dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return {
      isValid: false,
      error: 'Email username cannot start, end, or contain consecutive dots.',
    };
  }

  // Disallow fake usernames like test, fake, dummy, asdf, etc.
  if (FAKE_USERNAMES.has(localPart)) {
    return {
      isValid: false,
      error: 'Generic test and placeholder email addresses are forbidden. Please use your real email.',
    };
  }

  // Disallow repetitive single-character usernames (e.g. aaaaa, 11111)
  if (/^(.)\1{3,}$/.test(localPart)) {
    return {
      isValid: false,
      error: 'Please provide a legitimate, personal email address.',
    };
  }

  // Domain part checks
  if (!domainPart || domainPart.length > 253) {
    return {
      isValid: false,
      error: 'Email domain is invalid.',
    };
  }

  // Domain must contain at least one dot
  if (!domainPart.includes('.')) {
    return {
      isValid: false,
      error: 'Please enter a complete email address including domain (e.g. name@gmail.com).',
    };
  }

  // Check for common domain typos (e.g. gmial.com, yaho.com)
  if (COMMON_DOMAIN_TYPOS[domainPart]) {
    return {
      isValid: false,
      error: `Did you mean @${COMMON_DOMAIN_TYPOS[domainPart]}? Please check your email domain spelling.`,
    };
  }

  // Check for forbidden dummy/test domains
  if (FAKE_TEST_DOMAINS.has(domainPart)) {
    return {
      isValid: false,
      error: 'Placeholder and fake email domains are not allowed. Please enter your real email.',
    };
  }

  // Check for disposable / temporary email providers
  if (DISPOSABLE_DOMAINS.has(domainPart)) {
    return {
      isValid: false,
      error: 'Disposable and temporary email accounts are forbidden on SportSync. Please use a permanent email.',
    };
  }

  // Check subdomains of disposable services (e.g. xyz.mailinator.com)
  for (const disposable of DISPOSABLE_DOMAINS) {
    if (domainPart.endsWith(`.${disposable}`)) {
      return {
        isValid: false,
        error: 'Disposable and temporary email accounts are forbidden on SportSync. Please use a permanent email.',
      };
    }
  }

  // Check domain labels
  const domainLabels = domainPart.split('.');
  const tld = domainLabels[domainLabels.length - 1];

  // TLD checks
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address with a recognized top-level domain.',
    };
  }

  if (FORBIDDEN_TLDS.has(tld)) {
    return {
      isValid: false,
      error: `Domains ending in .${tld} are forbidden. Please use a real email address.`,
    };
  }

  for (const label of domainLabels) {
    if (!label || label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: 'Email domain contains invalid formatting.',
      };
    }
  }

  // Standard RFC regex check
  const standardEmailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!standardEmailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address format (e.g. player@gmail.com).',
    };
  }

  return {
    isValid: true,
    normalizedEmail: trimmed,
  };
}

/**
 * Server-side email validation with DNS MX record lookup to verify the domain can receive mail.
 */
export async function validateRealEmailWithMx(email: unknown): Promise<EmailValidationResult> {
  const baseResult = validateRealEmail(email);
  if (!baseResult.isValid || !baseResult.normalizedEmail) {
    return baseResult;
  }

  const domainPart = baseResult.normalizedEmail.split('@')[1];
  if (!domainPart) {
    return {
      isValid: false,
      error: 'Email domain is invalid.',
    };
  }

  if (typeof window === 'undefined') {
    try {
      const dns = await import(/* webpackIgnore: true */ 'node:dns');
      const mxRecords = await dns.promises.resolveMx(domainPart);
      if (!Array.isArray(mxRecords) || mxRecords.length === 0 || !mxRecords.some((r) => r && r.exchange)) {
        return {
          isValid: false,
          error: `Email domain "${domainPart}" does not have valid mail servers (MX records). Please use a real, active email address.`,
        };
      }
    } catch (err: unknown) {
      const code = String((err as { code?: string })?.code || '');
      if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL' || code === 'EREFUSED') {
        return {
          isValid: false,
          error: `Email domain "${domainPart}" cannot receive emails. Please check the domain spelling and use a valid email address.`,
        };
      }
      return {
        isValid: false,
        error: `Unable to verify email domain "${domainPart}". Please enter a valid, active email address.`,
      };
    }
  }

  return baseResult;
}


