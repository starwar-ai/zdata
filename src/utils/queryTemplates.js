const fs = require('fs');
const path = require('path');

/**
 * Load query templates from JSON files in dql directory
 * Templates are reloaded on every request for dynamic updates
 */
function loadTemplates() {
  const queryTemplates = {};
  const dqlDir = path.join(__dirname, '../../dql');
  
  try {
    // Check if dql directory exists
    if (!fs.existsSync(dqlDir)) {
      console.warn('DQL directory not found:', dqlDir);
      return queryTemplates;
    }
    
    // Read all JSON files in dql directory
    const files = fs.readdirSync(dqlDir).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      const filePath = path.join(dqlDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const templates = JSON.parse(content);
        
        // Add each template to the collection
        templates.forEach(template => {
          if (template.id) {
            queryTemplates[template.id] = template;
          }
        });
      } catch (error) {
        console.error(`Error loading template file ${file}:`, error.message);
      }
    });
  } catch (error) {
    console.error('Error loading query templates:', error);
  }
  
  return queryTemplates;
}

/**
 * Get all query templates
 * Reloads templates from disk on every call
 */
function getAllTemplates() {
  const queryTemplates = loadTemplates();
  return Object.values(queryTemplates);
}

/**
 * Get query templates by category
 * Reloads templates from disk on every call
 */
function getTemplatesByCategory(category) {
  const queryTemplates = loadTemplates();
  return Object.values(queryTemplates).filter(
    template => template.category === category
  );
}

/**
 * Get all categories
 * Reloads templates from disk on every call
 */
function getCategories() {
  const queryTemplates = loadTemplates();
  const categories = [...new Set(
    Object.values(queryTemplates).map(t => t.category)
  )];
  return categories.map(category => ({
    name: category,
    count: Object.values(queryTemplates).filter(t => t.category === category).length
  }));
}

/**
 * Get template by ID
 * Reloads templates from disk on every call
 */
function getTemplateById(id) {
  const queryTemplates = loadTemplates();
  return queryTemplates[id] || null;
}

module.exports = {
  loadTemplates,
  getAllTemplates,
  getTemplatesByCategory,
  getCategories,
  getTemplateById
};
