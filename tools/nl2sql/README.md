# Natural Language to SQL CLI Tool

A powerful command-line tool that converts natural language queries to SQL statements using Claude AI with Extended Thinking mode support.

## Features

- **Natural Language Processing**: Convert plain English queries to accurate SQL
- **Extended Thinking Mode**: See Claude's reasoning process in real-time
- **DDL Optimization**: Automatically optimizes database schemas to reduce token usage (60-80% reduction)
- **Streaming Display**: Real-time streaming of thinking process and responses
- **Multiple Models**: Choose between Opus (best accuracy) and Sonnet (faster)
- **Flexible DDL Sources**: Use DDL files or database configurations
- **Multiple Output Formats**: SQL-only, full response, or JSON

## Installation

1. Install Python dependencies:
```bash
cd /home/user/zdata/tools/nl2sql
pip install -r requirements.txt
```

2. Set up your Anthropic API key in `.env`:
```bash
# Add to /home/user/zdata/.env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

## Usage

### Basic Usage

```bash
# With DDL file
python -m nl2sql "Show me all active users" --ddl /path/to/schema.sql

# With database configuration
python -m nl2sql "Count orders by status" --db local
```

### Advanced Usage

```bash
# Use Sonnet model (faster)
python -m nl2sql "List top 10 products" --db local --model sonnet

# Save SQL to file
python -m nl2sql "Find users with no orders" --ddl schema.sql --output query.sql

# Disable thinking display (still uses thinking mode)
python -m nl2sql "Get total revenue" --db local --hide-thinking

# Disable thinking mode completely (faster, less accurate)
python -m nl2sql "Simple query" --db local --no-thinking

# JSON output format
python -m nl2sql "Count users" --db local --format json

# SQL-only output (no explanation)
python -m nl2sql "Select users" --db local --format sql-only
```

### Interactive Mode

Read query from stdin:
```bash
echo "Show me users created in the last week" | python -m nl2sql --db local

# Or use heredoc
python -m nl2sql --db local <<EOF
Show me the top 10 customers by total order value,
including their name, email, and total spent
EOF
```

### List Available Databases

```bash
python -m nl2sql --list-databases
```

## Command-Line Options

### Required (one of):
- `query` - Natural language query (or read from stdin)

### DDL Source (one required):
- `--ddl PATH` - Path to DDL file
- `--db NAME` - Database name from config/databases.yaml

### Optional:
- `--model {opus|sonnet}` - Claude model selection (default: opus)
- `-o, --output FILE` - Save SQL to file
- `--format {sql-only|full|json}` - Output format (default: full)
- `--ddl-format {erd|compact|minimal}` - DDL optimization format (default: erd)
- `--no-thinking` - Disable extended thinking mode
- `--hide-thinking` - Use thinking but don't display it
- `--config PATH` - Custom config file path
- `--debug` - Enable debug output
- `--list-databases` - List available databases

## Examples

### Example 1: Basic Query
```bash
python -m nl2sql "Show me all users" --db local
```

Output:
```
Loading DDL from local (format: erd)...
Sending query to Claude (opus)...

💭 Claude is thinking...
First, I need to understand the schema structure. Looking at the DDL, I can see there's a users table...

✓ Response:

```sql
SELECT * FROM users;
```

**Explanation**: Retrieves all columns from the users table.
```

### Example 2: Complex Query
```bash
python -m nl2sql "Show me the top 10 customers by total order value in 2024" --db local
```

Output shows Claude's thinking process analyzing the schema, understanding relationships, and generating optimized SQL.

### Example 3: Save to File
```bash
python -m nl2sql "Get all active products" --db local --output products.sql --format sql-only
```

Creates `products.sql` with just the SQL query.

### Example 4: JSON Output
```bash
python -m nl2sql "Count users by country" --db local --format json
```

Output:
```json
{
  "sql": "SELECT country, COUNT(*) as user_count FROM users GROUP BY country;",
  "full_response": "```sql\nSELECT country, COUNT(*) as user_count FROM users GROUP BY country;\n```\n\n**Explanation**: Groups users by country and counts them."
}
```

## Configuration

### Config File: `config/nl2sql.yaml`

```yaml
# Model settings
model:
  default: opus  # opus | sonnet
  opus_id: claude-opus-4-5-20251101
  sonnet_id: claude-sonnet-4-5-20250929
  max_tokens: 4096
  temperature: 0.0

# DDL optimization
ddl:
  default_format: erd  # erd | compact | minimal

# Output preferences
output:
  default_format: full  # sql-only | full | json

# Thinking mode
thinking:
  enabled: true
  show_by_default: true

# API configuration
api:
  timeout: 60
  retry_attempts: 3
```

### Environment Variables

Add to `/home/user/zdata/.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

## DDL Optimization Formats

The tool automatically optimizes DDL schemas for LLM consumption:

- **ERD** (default): Entity-Relationship format, 75-80% token reduction
  - Best for understanding relationships and joins
  - Includes index hints for optimization

- **Compact**: Condensed format, 60-70% token reduction
  - Good balance of detail and brevity

- **Minimal**: Maximum compression, 80-85% token reduction
  - Use for very large schemas

## How It Works

1. **Load DDL**: Loads database schema from file or config
2. **Optimize DDL**: Uses DDL Optimizer to reduce token usage
3. **Build Prompt**: Creates system prompt with optimized schema
4. **Call Claude API**: Streams response with Extended Thinking
5. **Display**: Shows thinking process and final SQL in real-time
6. **Extract SQL**: Parses SQL from response

## Extended Thinking Mode

Extended Thinking allows Claude to deeply analyze your query before generating SQL:

- **What it does**: Claude thinks through the problem step-by-step
- **Benefits**: More accurate SQL for complex queries
- **Visible**: See Claude's reasoning in real-time (unless `--hide-thinking`)
- **Disable**: Use `--no-thinking` for faster but potentially less accurate results

## Troubleshooting

### API Key Error
```
Error: ANTHROPIC_API_KEY not found in environment
```
**Solution**: Add your API key to `/home/user/zdata/.env`

### DDL File Not Found
```
Error: DDL file not found: /path/to/schema.sql
```
**Solution**: Check the file path or use `--db` with a configured database name

### Database Not Found
```
Error: Database not found in config: mydb
```
**Solution**: Check `config/databases.yaml` or use `--list-databases` to see available databases

## Performance

- **Opus Model**: 3-8 seconds (with thinking), best accuracy
- **Sonnet Model**: 1-3 seconds, good for simple queries
- **Token Usage**: ~500-2000 input + ~200-500 output per query
- **Cost**: Varies based on model and query complexity

## Integration with Existing Tools

This tool integrates seamlessly with the existing DDL Optimizer:

```python
from nl2sql import NL2SQLEngine, Config

# Initialize engine
config = Config()
engine = NL2SQLEngine(config)

# Convert query
response = engine.convert(
    query="Show me all users",
    ddl_source="local",
    source_type="db"
)
```

## License

MIT License

## Contributing

Contributions welcome! Please submit issues and pull requests.

## Support

For issues, please check:
1. API key is correctly set in `.env`
2. DDL files/databases are accessible
3. Dependencies are installed: `pip install -r requirements.txt`

For bugs or feature requests, please file an issue.
