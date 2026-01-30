const { jsonFileToCsv } = require('./src/utils/jsonToCsv');
const path = require('path');

// Example: Convert contracts.json to CSV
const inputFile = path.join(__dirname, 'data.json');
const outputFile = path.join(__dirname,  'data.csv');

jsonFileToCsv(inputFile, outputFile)
  .then(filePath => {
    console.log(`✓ Successfully converted to: ${filePath}`);
  })
  .catch(error => {
    console.error('✗ Conversion failed:', error.message);
  });
