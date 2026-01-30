const axios = require('axios');

// Exchange rate API base URL
const EXCHANGE_API_URL = process.env.EXCHANGE_API_URL || 'http://localhost:3000';

/**
 * Fetch exchange rate for a specific date and currency pair
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} fromCurrency - Source currency (3-letter code)
 * @param {string} toCurrency - Target currency (3-letter code, default: CNY)
 * @returns {Promise<{rate: number, source: string, date: string}>}
 * @throws {Error} If API call fails or rate not found
 */
async function fetchExchangeRate(date, fromCurrency, toCurrency = 'CNY') {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
    }

    // Normalize currency codes to uppercase
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Make API request
    const response = await axios.post(`${EXCHANGE_API_URL}/api/rates/fetch`, {
      date,
      from,
      to
    });

    if (!response.data || !response.data.success) {
      throw new Error(`Failed to fetch exchange rate: ${response.data?.error || 'Unknown error'}`);
    }

    const rateData = response.data.data;
    
    return {
      rate: rateData.rate,
      source: response.data.source || 'unknown',
      date: rateData.date,
      fromCurrency: from,
      toCurrency: to
    };
  } catch (error) {
    if (error.response) {
      // API returned error response
      throw new Error(
        `Exchange rate API error: ${error.response.data?.error || error.response.statusText}`
      );
    } else if (error.request) {
      // No response received
      throw new Error(
        `Failed to connect to exchange rate API at ${EXCHANGE_API_URL}`
      );
    } else {
      // Other errors
      throw error;
    }
  }
}

/**
 * Convert amount to CNY using exchange rate for specific date
 * @param {number} amount - Amount to convert
 * @param {string} currency - Source currency (3-letter code)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{cnyAmount: number, rate: number, source: string}>}
 */
async function convertToCNY(amount, currency, date) {
  const normalizedCurrency = currency.toUpperCase();
  
  // If already in CNY or RMB, no conversion needed
  if (normalizedCurrency === 'CNY' || normalizedCurrency === 'RMB') {
    return {
      cnyAmount: amount,
      rate: 1,
      source: 'no_conversion',
      originalCurrency: normalizedCurrency
    };
  }

  // Fetch exchange rate and convert
  const rateInfo = await fetchExchangeRate(date, normalizedCurrency, 'CNY');
  const cnyAmount = amount * rateInfo.rate;

  return {
    cnyAmount,
    rate: rateInfo.rate,
    source: rateInfo.source,
    originalCurrency: normalizedCurrency,
    rateDate: rateInfo.date
  };
}

/**
 * Format date from ISO string to YYYY-MM-DD
 * @param {string|Date} dateInput - Date in ISO format or Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
function formatDateToYYYYMMDD(dateInput) {
  const date = new Date(dateInput);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

module.exports = {
  fetchExchangeRate,
  convertToCNY,
  formatDateToYYYYMMDD
};
