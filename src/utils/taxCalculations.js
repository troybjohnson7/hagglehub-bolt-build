import { supabase } from '@/api/entities';

/**
 * Tax and Fee Calculation Utilities
 *
 * Provides functions to:
 * - Look up tax rates by zip code
 * - Calculate sales tax and fees
 * - Calculate Out-The-Door (OTD) price
 * - Handle manual overrides
 */

/**
 * Looks up tax rate data for a given zip code
 * Falls back to state average if zip code not found
 */
export async function getTaxRateByZipCode(zipCode) {
  if (!zipCode || zipCode.length !== 5) {
    return null;
  }

  try {
    // First try exact zip code match
    const { data: zipData, error: zipError } = await supabase
      .from('zip_code_tax_rates')
      .select('*')
      .eq('zip_code', zipCode)
      .maybeSingle();

    if (zipData) {
      return zipData;
    }

    // If no exact match, try to get state average
    // Extract state from zip code patterns (simplified - would need real zip-to-state mapping)
    if (zipError) {
      console.warn('No tax data found for zip code:', zipCode);
    }

    return null;
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return null;
  }
}

/**
 * Gets state average tax rates for fallback
 */
export async function getStateTaxRates(state) {
  if (!state) return null;

  try {
    const { data, error } = await supabase
      .from('zip_code_tax_rates')
      .select('*')
      .eq('state', state)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching state tax rates:', error);
    return null;
  }
}

/**
 * Calculates all taxes and fees for a given sales price and zip code
 *
 * @param {number} salesPrice - The negotiated sales price (before taxes/fees)
 * @param {string} zipCode - Buyer's 5-digit zip code
 * @returns {Object} Breakdown of all taxes and fees
 */
export async function calculateTaxesAndFees(salesPrice, zipCode) {
  if (!salesPrice || salesPrice <= 0) {
    return {
      salesTax: 0,
      registrationFee: 0,
      docFee: 0,
      titleFee: 0,
      totalFees: 0,
      estimatedOTD: salesPrice || 0,
      taxRate: 0,
      zipCodeData: null,
      calculationMethod: 'no_price'
    };
  }

  // Try to get tax data for the zip code
  const taxData = await getTaxRateByZipCode(zipCode);

  if (!taxData) {
    // Return default conservative estimates if no tax data available
    const defaultSalesTax = salesPrice * 0.08; // 8% default estimate
    const defaultRegFee = 200;
    const defaultDocFee = 300;
    const defaultTitleFee = 50;
    const totalFees = defaultRegFee + defaultDocFee + defaultTitleFee;
    const estimatedOTD = salesPrice + defaultSalesTax + totalFees;

    return {
      salesTax: Math.round(defaultSalesTax * 100) / 100,
      registrationFee: defaultRegFee,
      docFee: defaultDocFee,
      titleFee: defaultTitleFee,
      totalFees: totalFees,
      estimatedOTD: Math.round(estimatedOTD * 100) / 100,
      taxRate: 0.08,
      zipCodeData: null,
      calculationMethod: 'default_estimate'
    };
  }

  // Calculate with actual tax data
  const salesTax = salesPrice * parseFloat(taxData.sales_tax_rate);
  const registrationFee = parseFloat(taxData.registration_base_fee);
  const docFee = parseFloat(taxData.doc_fee_average);
  const titleFee = parseFloat(taxData.title_fee);
  const totalFees = registrationFee + docFee + titleFee;
  const estimatedOTD = salesPrice + salesTax + totalFees;

  return {
    salesTax: Math.round(salesTax * 100) / 100,
    registrationFee: Math.round(registrationFee * 100) / 100,
    docFee: Math.round(docFee * 100) / 100,
    titleFee: Math.round(titleFee * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    estimatedOTD: Math.round(estimatedOTD * 100) / 100,
    taxRate: parseFloat(taxData.sales_tax_rate),
    zipCodeData: taxData,
    calculationMethod: 'zip_code_lookup'
  };
}

/**
 * Calculates OTD price from individual components
 * Used when user manually edits fees
 */
export function calculateOTDFromComponents(salesPrice, salesTax, regFee, docFee, titleFee) {
  const total = (
    parseFloat(salesPrice || 0) +
    parseFloat(salesTax || 0) +
    parseFloat(regFee || 0) +
    parseFloat(docFee || 0) +
    parseFloat(titleFee || 0)
  );

  return Math.round(total * 100) / 100;
}

/**
 * Saves calculated fees to a deal in the database
 *
 * @param {string} dealId - Deal UUID
 * @param {Object} fees - Fee breakdown object from calculateTaxesAndFees
 * @param {boolean} manualOverride - Whether these are user-edited values
 */
export async function saveDealFees(dealId, fees, manualOverride = false) {
  try {
    const feesBreakdown = {
      sales_tax: fees.salesTax,
      registration_fee: fees.registrationFee,
      doc_fee: fees.docFee,
      title_fee: fees.titleFee,
      total_fees: fees.totalFees,
      tax_rate: fees.taxRate,
      calculation_method: fees.calculationMethod,
      last_updated: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('deals')
      .update({
        estimated_sales_tax: fees.salesTax,
        estimated_registration_fee: fees.registrationFee,
        estimated_doc_fee: fees.docFee,
        estimated_title_fee: fees.titleFee,
        estimated_total_fees: fees.totalFees,
        otd_price: fees.estimatedOTD,
        fees_breakdown: feesBreakdown,
        manual_fees_override: manualOverride,
        tax_calculation_date: new Date().toISOString()
      })
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving deal fees:', error);
    throw error;
  }
}

/**
 * Updates OTD price when asking price or current offer changes
 * Only recalculates if manual override is not set
 */
export async function updateDealOTDPrice(dealId, newSalesPrice, zipCode) {
  try {
    // Get current deal to check manual override status
    const { data: deal, error: fetchError } = await supabase
      .from('deals')
      .select('manual_fees_override, buyer_zip_code')
      .eq('id', dealId)
      .single();

    if (fetchError) throw fetchError;

    // If manual override is set, don't auto-recalculate
    if (deal.manual_fees_override) {
      console.log('Manual override set, skipping auto-calculation');
      return null;
    }

    // Use provided zip or fallback to deal's saved zip
    const effectiveZipCode = zipCode || deal.buyer_zip_code;

    // Calculate new fees
    const fees = await calculateTaxesAndFees(newSalesPrice, effectiveZipCode);

    // Save to database
    return await saveDealFees(dealId, fees, false);
  } catch (error) {
    console.error('Error updating deal OTD price:', error);
    throw error;
  }
}

/**
 * Validates a US zip code format
 */
export function isValidZipCode(zipCode) {
  if (!zipCode) return false;
  const zipRegex = /^\d{5}$/;
  return zipRegex.test(zipCode);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format tax rate as percentage
 */
export function formatTaxRate(rate) {
  if (rate === null || rate === undefined) return '-';
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Convert sales price to OTD price using deal's fees
 */
export function convertSalesPriceToOTD(salesPrice, deal) {
  if (!salesPrice) return 0;

  const salesTax = deal.estimated_sales_tax || 0;
  const regFee = deal.estimated_registration_fee || 0;
  const docFee = deal.estimated_doc_fee || 0;
  const titleFee = deal.estimated_title_fee || 0;

  return Math.round((parseFloat(salesPrice) + salesTax + regFee + docFee + titleFee) * 100) / 100;
}

/**
 * Convert OTD price to sales price using deal's fees
 */
export function convertOTDToSalesPrice(otdPrice, deal) {
  if (!otdPrice) return 0;

  const salesTax = deal.estimated_sales_tax || 0;
  const regFee = deal.estimated_registration_fee || 0;
  const docFee = deal.estimated_doc_fee || 0;
  const titleFee = deal.estimated_title_fee || 0;

  return Math.round((parseFloat(otdPrice) - salesTax - regFee - docFee - titleFee) * 100) / 100;
}

/**
 * Get the total fees for a deal
 */
export function getTotalFees(deal) {
  const salesTax = deal.estimated_sales_tax || 0;
  const regFee = deal.estimated_registration_fee || 0;
  const docFee = deal.estimated_doc_fee || 0;
  const titleFee = deal.estimated_title_fee || 0;

  return Math.round((salesTax + regFee + docFee + titleFee) * 100) / 100;
}

/**
 * Sync OTD prices when deal prices change
 * Updates otd_* fields based on sales price fields
 */
export async function syncOTDPricesFromSalesPrice(dealId, deal) {
  try {
    const updateData = {};

    if (deal.asking_price) {
      updateData.otd_asking_price = convertSalesPriceToOTD(deal.asking_price, deal);
    }

    if (deal.current_offer) {
      updateData.otd_current_offer = convertSalesPriceToOTD(deal.current_offer, deal);
    }

    if (deal.target_price) {
      updateData.otd_target_price = convertSalesPriceToOTD(deal.target_price, deal);
    }

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return deal;
  } catch (error) {
    console.error('Error syncing OTD prices:', error);
    throw error;
  }
}

/**
 * Sync sales prices when OTD prices change
 * Updates sales price fields based on otd_* fields
 */
export async function syncSalesPricesFromOTD(dealId, deal) {
  try {
    const updateData = {};

    if (deal.otd_asking_price) {
      updateData.asking_price = convertOTDToSalesPrice(deal.otd_asking_price, deal);
    }

    if (deal.otd_current_offer) {
      updateData.current_offer = convertOTDToSalesPrice(deal.otd_current_offer, deal);
    }

    if (deal.otd_target_price) {
      updateData.target_price = convertOTDToSalesPrice(deal.otd_target_price, deal);
    }

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return deal;
  } catch (error) {
    console.error('Error syncing sales prices:', error);
    throw error;
  }
}

/**
 * Toggle negotiation mode and sync prices
 */
export async function toggleNegotiationMode(dealId, newMode, deal) {
  try {
    const { data, error } = await supabase
      .from('deals')
      .update({ negotiation_mode: newMode })
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error toggling negotiation mode:', error);
    throw error;
  }
}
