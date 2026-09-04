import { Branch } from '@/types/database';

/**
 * Normalizes a district/address string for resilient comparison.
 * Removes extra whitespace, diacritics / accents, and case differences.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/quan\s+/g, 'q')
    .replace(/thanh pho\s+/g, 'tp')
    .trim();
}

/**
 * Assigns the best matching branch based on the customer's district and address.
 * Standard mapping with fallback to default branch.
 */
export function assignBranch(
  district: string,
  shippingAddress: string,
  branches: Branch[]
): Branch | null {
  if (!branches || branches.length === 0) return null;

  const normDistrict = normalizeText(district);
  const normAddress = normalizeText(shippingAddress);

  // 1. Direct match on district
  let matched = branches.find(b => {
    const normBranchDistrict = normalizeText(b.district);
    return normBranchDistrict === normDistrict || (normDistrict && normBranchDistrict.includes(normDistrict));
  });

  if (matched) return matched;

  // 2. Keyword match in shipping address
  matched = branches.find(b => {
    const normBranchDistrict = normalizeText(b.district);
    const normBranchName = normalizeText(b.name);
    return (
      (normBranchDistrict && normAddress.includes(normBranchDistrict)) ||
      (normBranchName && normAddress.includes(normBranchName))
    );
  });

  if (matched) return matched;

  // 3. Fallback: Default to first available branch
  return branches[0];
}
