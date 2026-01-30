# Express MySQL Multi-Database API

A Node.js Express server that connects to multiple MySQL databases with YAML configuration, manages DDL scripts, and provides REST APIs for executing custom SQL queries.

## Features

- 🔌 **Multi-Database Support**: Connect to multiple MySQL databases simultaneously
- 📝 **YAML Configuration**: Easy-to-manage database configurations with environment variable substitution
- 🛠 **DDL Management**: Store and execute DDL scripts locally for each database
- 🔒 **Security**: Helmet security headers, parameterized queries, CORS support
- 🎯 **Transaction Support**: Execute multiple queries in transactions
- 📊 **Database Introspection**: List tables, view schemas, test connections
- ⚡ **Connection Pooling**: Efficient connection management with mysql2
- 📚 **Swagger Documentation**: Interactive API documentation with Swagger UI

## Project Structure

```
e:\zexport\tools\
├── src/
│   ├── config/
│   │   ├── database.js          # Database connection manager
│   │   └── swagger.js           # Swagger configuration
│   ├── routes/
│   │   ├── query.js             # Query execution routes
│   │   └── database.js          # Database management routes
│   ├── middleware/
│   │   └── errorHandler.js      # Error handling middleware
│   ├── utils/
│   │   └── ddlLoader.js         # DDL file loader utility
│   └── app.js                   # Main application entry
├── config/
│   └── databases.yaml           # Database configurations
├── ddl/
│   ├── database1/               # DDL scripts for database1
│   └── database2/               # DDL scripts for database2
├── package.json
├── .env.example                 # Environment template
└── README.md
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn

### Setup Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd e:\zexport\tools
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   copy .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   # Database Passwords
   DB1_PASSWORD=your_db1_password
   DB2_PASSWORD=your_db2_password

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

5. **Configure databases in `config/databases.yaml`:**
   ```yaml
   databases:
     - name: database1
       host: localhost
       port: 3306
       database: db1
       user: root
       password: ${DB1_PASSWORD}
       connectionLimit: 10
       ddlPath: ./ddl/database1
     - name: database2
       host: localhost
       port: 3306
       database: db2
       user: root
       password: ${DB2_PASSWORD}
       connectionLimit: 10
       ddlPath: ./ddl/database2
   ```

6. **Create MySQL databases:**
   ```sql
   CREATE DATABASE db1;
   CREATE DATABASE db2;
   ```

## Running the Server

### Start the server:
```bash
npm start
```

### Development mode (with auto-reload):
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Documentation

### Interactive Documentation (Swagger UI)

Once the server is running, access the interactive Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- 📖 Complete API documentation with request/response schemas
- 🧪 Interactive "Try it out" functionality to test endpoints directly
- 📋 Organized endpoints by categories (Health, Databases, DDL, Queries)
- ✨ Example requests and responses for all endpoints

### Base URL
```
http://localhost:3000
```

### Health Check

#### `GET /health`
Check server health status.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-27T10:00:00.000Z",
  "uptime": 123.456
}
```

---

### Database Management

#### `GET /api/databases`
List all configured databases.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 2,
    "databases": [
      {
        "name": "database1",
        "host": "localhost",
        "port": 3306,
        "database": "db1",
        "ddlPath": "./ddl/database1"
      }
    ]
  }
}
```

#### `GET /api/databases/:name/test`
Test database connection.

**Example:**
```bash
curl http://localhost:3000/api/databases/database1/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "message": "Connection successful"
  }
}
```

#### `GET /api/databases/:name/tables`
List all tables in a database.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "count": 3,
    "tables": [
      { "Tables_in_db1": "users" },
      { "Tables_in_db1": "products" },
      { "Tables_in_db1": "orders" }
    ]
  }
}
```

#### `GET /api/databases/:name/tables/:tableName/schema`
Get schema information for a specific table.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "table": "users",
    "columns": [
      {
        "Field": "id",
        "Type": "int",
        "Null": "NO",
        "Key": "PRI",
        "Default": null,
        "Extra": "auto_increment"
      }
    ]
  }
}
```

---

### DDL Management

#### `GET /api/databases/:name/ddl`
List all DDL scripts for a database.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "count": 2,
    "scripts": [
      {
        "name": "01_create_tables.sql",
        "size": 1234,
        "modified": "2024-01-27T10:00:00.000Z"
      }
    ]
  }
}
```

#### `GET /api/databases/:name/ddl/:scriptName`
Get content of a specific DDL script.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "scriptName": "01_create_tables.sql",
    "content": "CREATE TABLE users ..."
  }
}
```

#### `POST /api/databases/:name/ddl/execute`
Execute a DDL script.

**Request Body:**
```json
{
  "scriptName": "01_create_tables.sql"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "scriptName": "01_create_tables.sql",
    "totalStatements": 3,
    "results": [
      {
        "success": true,
        "statement": "CREATE TABLE users ...",
        "affectedRows": 0
      }
    ]
  }
}
```

---

### Query Execution

#### `POST /api/query/execute`
Execute a custom SQL query.

**Request Body:**
```json
{
  "database": "database1",
  "sql": "SELECT * FROM users WHERE status = ?",
  "params": ["active"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "queryType": "SELECT",
    "rowCount": 2,
    "results": [
      {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "status": "active"
      }
    ]
  }
}
```

#### `POST /api/query/batch`
Execute multiple queries in a transaction.

**Request Body:**
```json
{
  "database": "database1",
  "queries": [
    {
      "sql": "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      "params": ["new_user", "new@example.com", "hashed_pass"]
    },
    {
      "sql": "UPDATE products SET stock = stock - 1 WHERE id = ?",
      "params": [1]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "database1",
    "totalQueries": 2,
    "results": [
      {
        "index": 0,
        "affectedRows": 1,
        "insertId": 4
      },
      {
        "index": 1,
        "affectedRows": 1,
        "insertId": 0
      }
    ]
  }
}
```

#### `POST /api/query/prepared`
Execute a prepared statement (recommended for user input).

**Request Body:**
```json
{
  "database": "database1",
  "sql": "SELECT * FROM users WHERE email = ? AND status = ?",
  "params": ["john@example.com", "active"]
}
```

---

## Example Usage

### Using curl

**Execute a query:**
```bash
curl -X POST http://localhost:3000/api/query/execute \
  -H "Content-Type: application/json" \
  -d "{\"database\":\"database1\",\"sql\":\"SELECT * FROM users LIMIT 5\"}"
```

**Execute DDL script:**
```bash
curl -X POST http://localhost:3000/api/databases/database1/ddl/execute \
  -H "Content-Type: application/json" \
  -d "{\"scriptName\":\"01_create_tables.sql\"}"
```

### Using JavaScript (fetch)

```javascript
// Execute a query
const response = await fetch('http://localhost:3000/api/query/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    database: 'database1',
    sql: 'SELECT * FROM users WHERE id = ?',
    params: [1]
  })
});
const data = await response.json();
console.log(data);
```

---

## Security Considerations

1. **Parameterized Queries**: Always use parameterized queries to prevent SQL injection
2. **Environment Variables**: Store sensitive credentials in `.env` file (never commit to version control)
3. **CORS Configuration**: Configure CORS appropriately for production
4. **Authentication**: Consider adding JWT or API key authentication for production use
5. **Input Validation**: Validate all user inputs before processing
6. **Connection Limits**: Configure appropriate connection pool limits

---

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional error details (optional)",
    "stack": "Stack trace (development only)"
  }
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found (database/table not found)
- `500` - Internal Server Error

---

## Development

### Adding a New Database

1. Add database configuration to `config/databases.yaml`
2. Add password to `.env` file
3. Create DDL directory: `mkdir ddl/database_name`
4. Add DDL scripts to the new directory
5. Restart the server

### Project Dependencies

- **express**: Web framework
- **mysql2**: MySQL client with Promise support
- **js-yaml**: YAML parser
- **dotenv**: Environment variable management
- **helmet**: Security headers
- **cors**: CORS support

---

## Troubleshooting

### Connection Errors

If you see database connection errors:
1. Verify MySQL server is running
2. Check database credentials in `.env`
3. Ensure databases exist in MySQL
4. Verify network connectivity and firewall settings

### Module Not Found Errors

Run:
```bash
npm install
```

---

## License

ISC

---

## Support

For issues or questions, please check the error messages in the console output or API responses.
