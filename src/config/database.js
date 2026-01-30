const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.pools = new Map();
    this.configs = [];
    this.globalDdlPath = null;
  }

  /**
   * Load database configurations from YAML file
   */
  loadConfig() {
    const configPath = path.join(__dirname, '../../config/databases.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Store global DDL path
    this.globalDdlPath = config.ddlPath || './ddl/local';
    
    // Replace environment variable placeholders
    this.configs = config.databases.map(db => {
      const dbConfig = { ...db };
      
      // Replace ${VAR_NAME} with process.env.VAR_NAME
      Object.keys(dbConfig).forEach(key => {
        if (typeof dbConfig[key] === 'string') {
          dbConfig[key] = dbConfig[key].replace(/\$\{(\w+)\}/g, (match, envVar) => {
            return process.env[envVar] || match;
          });
        }
      });
      
      return dbConfig;
    });
    
    return this.configs;
  }

  /**
   * Get global DDL path
   */
  getDdlPath() {
    return this.globalDdlPath;
  }

  /**
   * Initialize all database connection pools
   */
  async initializePools() {
    this.loadConfig();
    
    for (const dbConfig of this.configs) {
      try {
        const poolConfig = {
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          connectionLimit: dbConfig.connectionLimit || 10,
          waitForConnections: true,
          queueLimit: 0
        };
        
        const pool = mysql.createPool(poolConfig);
        this.pools.set(dbConfig.name, {
          pool,
          config: dbConfig
        });
        
        // Test connection
        const connection = await pool.getConnection();
        connection.release();
        
        console.log(`✓ Database '${dbConfig.name}' connected successfully`);
      } catch (error) {
        console.error(`✗ Failed to connect to database '${dbConfig.name}':`, error.message);
      }
    }
    
    return this.pools.size;
  }

  /**
   * Get connection pool by database name
   */
  getPool(dbName) {
    const poolInfo = this.pools.get(dbName);
    if (!poolInfo) {
      throw new Error(`Database '${dbName}' not found`);
    }
    return poolInfo.pool;
  }

  /**
   * Get database configuration by name
   */
  getConfig(dbName) {
    const poolInfo = this.pools.get(dbName);
    if (!poolInfo) {
      throw new Error(`Database '${dbName}' not found`);
    }
    return poolInfo.config;
  }

  /**
   * Get all configured databases
   */
  getAllDatabases() {
    return Array.from(this.pools.keys()).map(name => {
      const config = this.getConfig(name);
      return {
        name: config.name,
        host: config.host,
        port: config.port,
        database: config.database
      };
    });
  }

  /**
   * Test database connection
   */
  async testConnection(dbName) {
    try {
      const pool = this.getPool(dbName);
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Close all database connections
   */
  async closePools() {
    const closePromises = [];
    
    for (const [name, poolInfo] of this.pools.entries()) {
      closePromises.push(
        poolInfo.pool.end()
          .then(() => console.log(`✓ Database '${name}' connection closed`))
          .catch(err => console.error(`✗ Error closing database '${name}':`, err.message))
      );
    }
    
    await Promise.all(closePromises);
    this.pools.clear();
  }
}

// Export singleton instance
module.exports = new DatabaseManager();
