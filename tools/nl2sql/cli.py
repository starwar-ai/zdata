"""
Command-line interface for nl2sql tool
"""

import sys
import argparse
from pathlib import Path
from typing import Optional

from .config import Config
from .engine import NL2SQLEngine
from .ddl_manager import DDLManager


def create_parser() -> argparse.ArgumentParser:
    """Create CLI argument parser"""

    parser = argparse.ArgumentParser(
        prog='nl2sql',
        description='Natural Language to SQL Query Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with DDL file
  python -m nl2sql "Show me all users" --ddl /path/to/schema.sql

  # Use database configuration
  python -m nl2sql "Count orders by status" --db local

  # Save output to file
  python -m nl2sql "Top 10 products" --ddl schema.sql --output query.sql

  # Use faster model
  python -m nl2sql "List customers" --ddl schema.sql --model sonnet

  # Disable thinking display
  python -m nl2sql "Get user by id" --ddl schema.sql --no-thinking

  # Interactive mode (read from stdin)
  echo "Find inactive users" | python -m nl2sql --ddl schema.sql
        """
    )

    # Query input (optional, can read from stdin)
    parser.add_argument(
        'query',
        nargs='?',
        help='Natural language query (or read from stdin if not provided)'
    )

    # DDL source (mutually exclusive)
    ddl_group = parser.add_mutually_exclusive_group(required=False)
    ddl_group.add_argument(
        '--ddl',
        type=str,
        metavar='PATH',
        help='Path to DDL file'
    )
    ddl_group.add_argument(
        '--db',
        type=str,
        metavar='NAME',
        help='Database name from config/databases.yaml'
    )

    # Model selection
    parser.add_argument(
        '--model',
        choices=['opus', 'sonnet'],
        help='Claude model: opus (best) or sonnet (faster)'
    )

    # Output options
    parser.add_argument(
        '-o', '--output',
        type=str,
        metavar='FILE',
        help='Save SQL to file'
    )

    parser.add_argument(
        '--format',
        choices=['sql-only', 'full', 'json'],
        default='full',
        help='Output format (default: full)'
    )

    # DDL optimization
    parser.add_argument(
        '--ddl-format',
        choices=['erd', 'compact', 'minimal'],
        help='DDL format for LLM context (default: erd)'
    )

    # Thinking mode
    parser.add_argument(
        '--no-thinking',
        action='store_true',
        help='Disable extended thinking mode (faster but less thorough)'
    )

    parser.add_argument(
        '--hide-thinking',
        action='store_true',
        help='Use thinking but hide the output'
    )

    # Config file
    parser.add_argument(
        '--config',
        type=str,
        metavar='PATH',
        help='Path to nl2sql.yaml config file'
    )

    # Debugging
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug output'
    )

    parser.add_argument(
        '--list-databases',
        action='store_true',
        help='List available databases from config'
    )

    return parser


def main():
    """Main CLI entry point"""
    parser = create_parser()
    args = parser.parse_args()

    try:
        # Load configuration
        config = Config(args.config) if args.config else Config()

        # Handle --list-databases
        if args.list_databases:
            ddl_manager = DDLManager()
            databases = ddl_manager.get_available_databases()
            if databases:
                print("Available databases:")
                for db in databases:
                    print(f"  - {db}")
            else:
                print("No databases found in configuration")
            sys.exit(0)

        # Check if DDL source is provided (required for normal operation)
        if not args.ddl and not args.db:
            parser.error("one of the arguments --ddl --db is required")

        # Get query from args or stdin
        query = args.query
        if not query:
            if not sys.stdin.isatty():
                # Read from stdin
                query = sys.stdin.read().strip()
            else:
                parser.error("Query required (provide as argument or via stdin)")

        if not query:
            parser.error("Query cannot be empty")

        # Determine DDL source
        if args.ddl:
            ddl_source = args.ddl
            source_type = 'file'
        else:
            ddl_source = args.db
            source_type = 'db'

        # Determine thinking settings
        use_thinking = not args.no_thinking
        show_thinking = use_thinking and not args.hide_thinking

        # Initialize engine
        engine = NL2SQLEngine(config)

        # Convert query to SQL
        response_text = engine.convert(
            query=query,
            ddl_source=ddl_source,
            source_type=source_type,
            model=args.model,
            ddl_format=args.ddl_format,
            output_format=args.format,
            show_thinking=show_thinking,
            use_thinking=use_thinking
        )

        # Save to file if requested
        if args.output:
            engine.save_to_file(
                response_text=response_text,
                output_path=args.output,
                format_type='sql-only'
            )

        sys.exit(0)

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(130)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        if args.debug:
            import traceback
            traceback.print_exc()
        else:
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
