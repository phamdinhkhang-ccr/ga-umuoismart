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
 * Assigns the best matching branch based on the customer's district, address, and city.
 * Resilient multi-attribute routing engine.
 */
export function assignBranch(
  district: string,
  shippingAddress: string,
  branches: Branch[],
  city?: string
): Branch | null {
  if (!branches || branches.length === 0) return null;

  const normDistrict = normalizeText(district);
  const normAddress = normalizeText(shippingAddress);
  const normCity = normalizeText(city || '');

  // Check if target is Hanoi
  const isHanoi =
    normCity.includes('hanoi') ||
    normCity.includes('hn') ||
    normAddress.includes('ha noi') ||
    normAddress.includes('hn') ||
    normAddress.includes('thanh tri') ||
    normAddress.includes('dai thanh') ||
    normAddress.includes('thuong phuc') ||
    normDistrict.includes('thanh tri') ||
    normDistrict.includes('cau giay') ||
    normDistrict.includes('dong da') ||
    normDistrict.includes('ha dong');

  if (isHanoi) {
    const hanoiBranch = branches.find((b) => {
      const normBCity = normalizeText(b.city || '');
      const normBName = normalizeText(b.name || '');
      const normBDistrict = normalizeText(b.district || '');
      return normBCity.includes('hanoi') || normBName.includes('hanoi') || normBDistrict.includes('thanh tri');
    });
    if (hanoiBranch) return hanoiBranch;
  }

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
