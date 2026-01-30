"""
Main orchestration engine for NL to SQL conversion
"""

from typing import Optional
from .config import Config
from .ddl_manager import DDLManager
from .llm_client import ClaudeClient
from .display import StreamDisplay
from .prompts import build_system_prompt


class NL2SQLEngine:
    """Main engine for natural language to SQL conversion"""

    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the NL2SQL engine.

        Args:
            config: Configuration object. If None, creates default config.
        """
        self.config = config or Config()
        self.ddl_manager = DDLManager()

    def convert(
        self,
        query: str,
        ddl_source: str,
        source_type: str = 'file',
        model: Optional[str] = None,
        ddl_format: Optional[str] = None,
        output_format: str = 'full',
        show_thinking: bool = True,
        use_thinking: bool = True
    ) -> str:
        """
        Convert natural language query to SQL.

        Args:
            query: Natural language query
            ddl_source: DDL file path or database name
            source_type: 'file' or 'db'
            model: Model name ('opus' or 'sonnet'). If None, uses config default.
            ddl_format: DDL optimization format. If None, uses config default.
            output_format: Output format ('sql-only', 'full', 'json')
            show_thinking: Whether to display thinking process
            use_thinking: Whether to enable extended thinking mode

        Returns:
            Generated SQL response text

        Raises:
            FileNotFoundError: If DDL file not found
            ValueError: If invalid parameters
            Exception: If API call fails
        """
        try:
            # 1. Load and optimize DDL
            if ddl_format is None:
                ddl_format = self.config.get_ddl_format()

            print(f"Loading DDL from {ddl_source} (format: {ddl_format})...")
            optimized_ddl = self.ddl_manager.load_ddl(
                source=ddl_source,
                source_type=source_type,
                format_type=ddl_format
            )

            # 2. Build system prompt
            system_prompt = build_system_prompt(optimized_ddl)

            # 3. Initialize LLM client
            api_key = self.config.get_api_key()
            model_id = self.config.get_model_id(model)
            max_tokens = self.config.get_max_tokens()
            temperature = self.config.get_temperature()

            client = ClaudeClient(
                api_key=api_key,
                model=model_id,
                max_tokens=max_tokens,
                temperature=temperature
            )

            # 4. Generate SQL with streaming
            display = StreamDisplay(show_thinking=show_thinking)

            print(f"Sending query to Claude ({model_id.split('-')[1]})...\n")

            stream = client.generate_sql_stream(
                system_prompt=system_prompt,
                user_query=query,
                use_thinking=use_thinking
            )

            # 5. Process stream and display
            response_text = display.process_stream(stream)

            # 6. Display final result based on format
            if output_format != 'full':
                # For sql-only and json, display formatted output
                display.display_result(response_text, output_format)

            return response_text

        except FileNotFoundError as e:
            print(f"Error: {e}")
            raise
        except ValueError as e:
            print(f"Error: {e}")
            raise
        except Exception as e:
            print(f"Error: {e}")
            raise

    def save_to_file(self, response_text: str, output_path: str, format_type: str = 'sql-only'):
        """
        Save generated SQL to file.

        Args:
            response_text: Complete response text
            output_path: Path to output file
            format_type: What to save ('sql-only' or 'full')
        """
        display = StreamDisplay(show_thinking=False)

        if format_type == 'sql-only':
            sql = display.extract_sql(response_text)
            content = sql if sql else response_text
        else:
            content = response_text

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"\nSaved to: {output_path}")
