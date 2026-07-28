/**
 * LIVE STREAM PRIVACY & DATA MASKING UTILITY
 * 
 * Rules:
 * 1. Full Name MUST remain 100% visible in plain text for audience engagement.
 * 2. Sensitive contact fields (Email, Phone, LinkedIn, Address) MUST be obfuscated.
 */

/**
 * Mask individual contact fields based on type
 * @param {string} val 
 * @param {'name'|'email'|'phone'|'linkedin'|'address'} type 
 * @returns {string} Masked string or original name
 */
export function maskPII(val, type) {
  if (!val || typeof val !== 'string') return val;

  switch (type) {
    case 'name':
      // DO NOT MASK — Candidate full name remains visible for live stream engagement
      return val;

    case 'email': {
      // e.g., "duncanmakoyo@gmail.com" => "d**********@g****.com"
      const parts = val.split('@');
      if (parts.length !== 2) return '*****@****.com';
      const [namePart, domainPart] = parts;
      const maskedName = namePart.length > 2
        ? namePart[0] + '*'.repeat(Math.min(namePart.length - 1, 10))
        : namePart[0] + '*';
      const domainParts = domainPart.split('.');
      const maskedDomain = domainParts[0].length > 1
        ? domainParts[0][0] + '*'.repeat(Math.min(domainParts[0].length - 1, 4))
        : '*';
      const ext = domainParts.slice(1).join('.');
      return `${maskedName}@${maskedDomain}.${ext || 'com'}`;
    }

    case 'phone': {
      // e.g., "+254712345678" or "0712345678" => "+254 7** *** *78"
      const cleaned = val.trim();
      if (cleaned.length < 5) return '**** *** ***';
      const firstThree = cleaned.slice(0, 4);
      const lastTwo = cleaned.slice(-2);
      return `${firstThree} **** *** *${lastTwo}`;
    }

    case 'linkedin': {
      // e.g., "linkedin.com/in/duncan-makoyo" => "linkedin.com/in/********"
      if (val.toLowerCase().includes('linkedin.com')) {
        return val.replace(/(linkedin\.com\/(?:in|company|school)\/)[^\s/]+/i, '$1********');
      }
      return 'linkedin.com/in/********';
    }

    case 'address':
      return '**** [Redacted for Live Broadcast]';

    default:
      return val;
  }
}

/**
 * Sanitize raw text snippet for the dark Recruiter View Terminal
 * Obfuscates sensitive emails, phone numbers, and LinkedIn profile URLs
 * while preserving the candidate's name and experience text.
 * @param {string} rawText 
 * @param {object} contact 
 * @returns {string} Sanitized raw text
 */
export function sanitizeRawTextForLiveStream(rawText, contact = {}) {
  if (!rawText || typeof rawText !== 'string') return '';

  let sanitized = rawText;

  // Mask extracted email
  if (contact?.email) {
    const maskedEmail = maskPII(contact.email, 'email');
    sanitized = sanitized.replaceAll(contact.email, maskedEmail);
  } else {
    // Regex fallback for any unhandled emails
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (m) => maskPII(m, 'email'));
  }

  // Mask extracted phone
  if (contact?.phone) {
    const maskedPhone = maskPII(contact.phone, 'phone');
    sanitized = sanitized.replaceAll(contact.phone, maskedPhone);
  }

  // Mask extracted LinkedIn URL
  if (contact?.linkedin) {
    const maskedLinkedin = maskPII(contact.linkedin, 'linkedin');
    sanitized = sanitized.replaceAll(contact.linkedin, maskedLinkedin);
  }

  return sanitized;
}
