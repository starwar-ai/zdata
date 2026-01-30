const fs = require('fs');
const path = require('path');

/**
 * Convert JSON to CSV with Chinese encoding support
 * @param {Array|Object} jsonData - JSON data to convert
 * @param {string} outputPath - Output CSV file path
 * @param {Object} options - Conversion options
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @param {boolean} options.bom - Add BOM for UTF-8 (default: true, required for Excel Chinese support)
 * @returns {Promise<void>}
 */
async function jsonToCsv(jsonData, outputPath, options = {}) {
  const { encoding = 'utf8', bom = true } = options;

  // Ensure data is an array
  const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
  
  if (dataArray.length === 0) {
    throw new Error('JSON data is empty');
  }

  // Extract all unique keys from all objects, flatten nested JSON objects
  const allKeys = new Set();
  dataArray.forEach(item => {
    Object.keys(item).forEach(key => {
      let value = item[key];
      
      // Try to parse JSON string
      if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Not valid JSON, keep as string
        }
      }
      
      // If value is a plain object (not array), flatten it
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value).forEach(subKey => {
          allKeys.add(`${key}-${subKey}`);
        });
      } else {
        allKeys.add(key);
      }
    });
  });
  const headers = Array.from(allKeys);

  // Build CSV content
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.map(escapeCSVValue).join(','));
  
  // Add data rows
  dataArray.forEach(item => {
    const values = headers.map(header => {
      // Handle flattened nested object keys (e.g., "total_amount_rmb-amount")
      if (header.includes('-')) {
        const [parentKey, childKey] = header.split('-');
        let parentValue = item[parentKey];
        
        // Try to parse JSON string
        if (typeof parentValue === 'string' && parentValue.trim().startsWith('{')) {
          try {
            parentValue = JSON.parse(parentValue);
          } catch (e) {
            // Not valid JSON
          }
        }
        
        if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
          return escapeCSVValue(parentValue[childKey]);
        }
        return '';
      }
      
      let value = item[header];
      
      // Try to parse JSON string
      if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(value);
          // If it's an object, it should be flattened, so skip it here
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            return '';
          }
        } catch (e) {
          // Not valid JSON, keep as string
        }
      }
      
      // Don't JSON.stringify plain objects, they are already flattened
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return '';
      }
      return escapeCSVValue(value);
    });
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  
  // Add BOM for UTF-8 to ensure Excel displays Chinese correctly
  const output = bom ? '\ufeff' + csvContent : csvContent;
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(outputPath, output, { encoding });
  
  return outputPath;
}

/**
 * Escape CSV value to handle commas, quotes, and newlines
 * @param {*} value - Value to escape
 * @returns {string}
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
  }
  
  return stringValue;
}

/**
 * Convert JSON file to CSV file
 * @param {string} inputPath - Input JSON file path
 * @param {string} outputPath - Output CSV file path (optional, defaults to same name with .csv extension)
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} - Output file path
 */
async function jsonFileToCsv(inputPath, outputPath = null, options = {}) {
  // Read JSON file
  const jsonContent = fs.readFileSync(inputPath, 'utf8');
  const jsonData = JSON.parse(jsonContent);
  
  // Generate output path if not provided
  if (!outputPath) {
    const parsedPath = path.parse(inputPath);
    outputPath = path.join(parsedPath.dir, `${parsedPath.name}.csv`);
  }
  
  return jsonToCsv(jsonData, outputPath, options);
}

module.exports = {
  jsonToCsv,
  jsonFileToCsv,
  escapeCSVValue
};
