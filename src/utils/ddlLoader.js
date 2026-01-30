const fs = require('fs').promises;
const path = require('path');
const dbManager = require('../config/database');

class DDLLoader {
  /**
   * Get absolute path for DDL directory (global)
   */
  getDDLPath() {
    const globalDdlPath = dbManager.getDdlPath();
    return path.resolve(globalDdlPath);
  }

  /**
   * List all DDL scripts (unified for all databases)
   */
  async listDDLScripts() {
    try {
      const ddlPath = this.getDDLPath();
      
      // Check if directory exists
      try {
        await fs.access(ddlPath);
      } catch (error) {
        return [];
      }
      
      const files = await fs.readdir(ddlPath);
      const sqlFiles = files.filter(file => file.endsWith('.sql'));
      
      // Get file stats for each SQL file
      const fileDetails = await Promise.all(
        sqlFiles.map(async (file) => {
          const filePath = path.join(ddlPath, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      return fileDetails;
    } catch (error) {
      throw new Error(`Failed to list DDL scripts: ${error.message}`);
    }
  }

  /**
   * Read DDL script content
   */
  async readDDLScript(scriptName) {
    try {
      const ddlPath = this.getDDLPath();
      const scriptPath = path.join(ddlPath, scriptName);
      
      // Security check: ensure the file is within the DDL directory
      const resolvedPath = path.resolve(scriptPath);
      const resolvedDDLPath = path.resolve(ddlPath);
      
      if (!resolvedPath.startsWith(resolvedDDLPath)) {
        throw new Error('Invalid script path');
      }
      
      const content = await fs.readFile(scriptPath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read DDL script: ${error.message}`);
    }
  }

  /**
   * Execute DDL script on specified database
   */
  async executeDDLScript(dbName, scriptName) {
    try {
      // Read the script
      const sql = await this.readDDLScript(scriptName);
      
      // Get database pool
      const pool = dbManager.getPool(dbName);
      
      // Split SQL by semicolons to handle multiple statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      const results = [];
      
      // Execute each statement
      for (const statement of statements) {
        try {
          const [result] = await pool.query(statement);
          results.push({
            success: true,
            statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
            affectedRows: result.affectedRows
          });
        } catch (error) {
          results.push({
            success: false,
            statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
            error: error.message
          });
        }
      }
      
      return {
        scriptName,
        totalStatements: statements.length,
        results
      };
    } catch (error) {
      throw new Error(`Failed to execute DDL script: ${error.message}`);
    }
  }

  /**
   * Execute raw SQL content (not from file)
   */
  async executeSQL(dbName, sql) {
    try {
      const pool = dbManager.getPool(dbName);
      
      // Split SQL by semicolons to handle multiple statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      const results = [];
      
      for (const statement of statements) {
        const [result] = await pool.query(statement);
        results.push({
          success: true,
          affectedRows: result.affectedRows || 0
        });
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to execute SQL: ${error.message}`);
    }
  }
}

module.exports = new DDLLoader();
