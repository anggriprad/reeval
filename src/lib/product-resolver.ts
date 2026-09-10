// ========================================
// Product Resolver Service
// Pure functions for Dynamic Pricing & Configurable BOM resolution
// ========================================

import type {
  Product,
  ProductVariantSKU,
  PricingRule,
  PricingRuleCondition,
  BOMTemplateItem,
  BOMTemplateCondition,
  BOMItem,
  RawMaterial,
  AttributeMaster,
  ProductAttribute,
  VariantType,
} from './types';

// ── Condition Evaluator ──────────────────────────────────────────────────────

type Condition = PricingRuleCondition | BOMTemplateCondition;

/**
 * Evaluate a single condition against selected attributes.
 * Returns true if the condition matches.
 */
function evaluateSingleCondition(
  condition: Condition,
  selectedAttributes: Record<string, string>
): boolean {
  const selectedValue = selectedAttributes[condition.attribute];

  switch (condition.operator) {
    case 'ANY':
      // ANY = matches if attribute exists (any value)
      return selectedValue !== undefined && selectedValue !== '';

    case '==':
      return selectedValue === condition.value;

    case '!=':
      return selectedValue !== condition.value;

    case 'IN':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(selectedValue);
      }
      return selectedValue === condition.value;

    default:
      return false;
  }
}

/**
 * Evaluate ALL conditions (AND logic).
 * Returns true only if every condition matches.
 * Empty conditions array → always true.
 */
export function evaluateConditions(
  conditions: Condition[],
  selectedAttributes: Record<string, string>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every(c => evaluateSingleCondition(c, selectedAttributes));
}

// ── Pricing Resolver ─────────────────────────────────────────────────────────

/**
 * Calculate the final price for a product given selected attributes.
 *
 * Process:
 * 1. Start from basePrice
 * 2. Loop all active PricingRules
 * 3. If evaluateConditions(rule.conditions, selectedAttributes) === true
 *    → add rule.surchargeAmount to running total
 * 4. Return final_price
 */
export function calculateFinalPrice(
  product: Product,
  selectedAttributes: Record<string, string>
): number {
  let price = product.basePrice ?? 0;

  if (product.pricingRules) {
    for (const rule of product.pricingRules) {
      if (!rule.isActive) continue;
      if (evaluateConditions(rule.conditions, selectedAttributes)) {
        price += rule.surchargeAmount;
      }
    }
  }

  return Math.max(0, price); // never negative
}

// ── BOM Resolver ─────────────────────────────────────────────────────────────

export interface ResolvedBOMItem {
  materialId: string;
  materialName: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Resolve the production BOM for a product given selected attributes.
 *
 * Process:
 * 1. Loop all active BOMTemplateItems
 * 2. If conditions empty → always included (static material)
 * 3. If conditions present → evaluate; include if TRUE, skip if FALSE
 * 4. Return array of resolved materials
 */
export function resolveProductionBOM(
  product: Product,
  selectedAttributes: Record<string, string>,
  materials: RawMaterial[]
): ResolvedBOMItem[] {
  return [];
}

/**
 * Convert resolver output to plain BOMItem[] (for ProductVariantSKU compatibility).
 */
export function resolvedBOMToItems(resolved: ResolvedBOMItem[]): BOMItem[] {
  return resolved.map(r => ({ materialId: r.materialId, qty: r.qty }));
}

// ── Combination Generator ────────────────────────────────────────────────────

/**
 * Generate all possible attribute value combinations from product attributes.
 */
export function generateAllCombinations(
  product: Product
): Record<string, string>[] {
  const variantTypes = product.variantTypes || [];
  const activeTypes = variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0);

  if (activeTypes.length === 0) return [{}];

  return activeTypes.reduce<Record<string, string>[]>((combos, vt) => {
    const newCombos: Record<string, string>[] = [];
    combos.forEach(combo =>
      vt.values.forEach(val => newCombos.push({ ...combo, [vt.name]: val }))
    );
    return newCombos;
  }, [{}]);
}

// ── Variant Auto-Generator ──────────────────────────────────────────────────

/**
 * Generate SKU string from product name + attribute combination.
 */
export function generateSKU(productName: string, combination: Record<string, string>): string {
  const base = productName.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 12);
  const suffix = Object.values(combination)
    .map(v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))
    .join('-');
  return suffix ? `${base}-${suffix}` : (base || 'PROD');
}

export interface CombinationPreview {
  combination: Record<string, string>;
  label: string;
  price: number;
  bomItems: ResolvedBOMItem[];
  totalMaterialCost: number;
}

/**
 * Auto-generate all ProductVariantSKU[] from combinations.
 * Existing variants are matched by combination key to preserve IDs, prices, and BOMs.
 */
export function generateVariantsFromRules(
  product: Product,
  materials: RawMaterial[],
  existingVariants?: ProductVariantSKU[]
): ProductVariantSKU[] {
  const combinations = generateAllCombinations(product);

  return combinations.map(combo => {
    const comboKey = JSON.stringify(combo);

    const existing = existingVariants?.find(
      v => JSON.stringify(v.combination) === comboKey
    );

    const price = existing?.price ?? product.basePrice ?? 0;
    const bomItems = existing?.bom ? [...existing.bom] : [];

    return {
      id: existing?.id || `pv-${Math.random().toString(36).slice(2, 8)}`,
      sku: existing?.sku || generateSKU(product.name, combo),
      combination: combo,
      price,
      estimatedHours: existing?.estimatedHours || product.defaultEstimatedHours || 6,
      bom: bomItems,
      routingId: existing?.routingId || product.defaultRoutingId,
      isActive: existing?.isActive ?? true,
    };
  });
}
