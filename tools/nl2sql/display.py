"""
Real-time streaming display handler for thinking and responses
"""

import re
from typing import Iterator, Dict, Any, Optional
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.syntax import Syntax
from rich.markdown import Markdown


class StreamDisplay:
    """Handles real-time display of streaming LLM responses"""

    def __init__(self, show_thinking: bool = True):
        """
        Initialize stream display.

        Args:
            show_thinking: Whether to display thinking blocks
        """
        self.console = Console()
        self.show_thinking = show_thinking
        self.thinking_buffer = []
        self.text_buffer = []
        self.in_thinking_block = False

    def process_stream(self, stream_iterator: Iterator[Dict[str, Any]]) -> str:
        """
        Process and display streaming response in real-time.

        Args:
            stream_iterator: Iterator of stream events

        Returns:
            Complete response text

        Raises:
            Exception: If stream contains error event
        """
        thinking_content = []
        text_content = []
        current_display = ""

        try:
            for event in stream_iterator:
                event_type = event.get('type')

                if event_type == 'block_start':
                    block_type = event.get('block_type')
                    if block_type == 'thinking':
                        self.in_thinking_block = True
                        if self.show_thinking:
                            self.console.print(
                                "\n[dim cyan]💭 Claude is thinking...[/dim cyan]\n"
                            )

                elif event_type == 'thinking':
                    if self.show_thinking:
                        content = event.get('content', '')
                        thinking_content.append(content)
                        # Print thinking content as it arrives
                        self.console.print(content, end='', style='dim cyan')

                elif event_type == 'text':
                    if self.in_thinking_block and self.show_thinking:
                        # Transition from thinking to response
                        self.in_thinking_block = False
                        self.console.print("\n\n[bold green]✓ Response:[/bold green]\n")

                    content = event.get('content', '')
                    text_content.append(content)
                    # Print text content as it arrives
                    self.console.print(content, end='')

                elif event_type == 'block_stop':
                    if self.in_thinking_block:
                        self.in_thinking_block = False
                        if self.show_thinking:
                            self.console.print()  # Add newline

                elif event_type == 'message_stop':
                    # End of message
                    self.console.print()  # Final newline
                    break

                elif event_type == 'error':
                    error_msg = event.get('error', 'Unknown error')
                    error_type = event.get('error_type', 'error')
                    self.console.print(
                        f"\n[bold red]Error ({error_type}):[/bold red] {error_msg}",
                        style='red'
                    )
                    raise Exception(f"{error_type}: {error_msg}")

            # Return complete text
            return ''.join(text_content)

        except KeyboardInterrupt:
            self.console.print("\n\n[yellow]Interrupted by user[/yellow]")
            return ''.join(text_content)

    def extract_sql(self, response_text: str) -> Optional[str]:
        """
        Extract SQL query from response text.

        Args:
            response_text: Complete response text

        Returns:
            Extracted SQL query or None if not found
        """
        # Look for SQL code block
        sql_pattern = r'```sql\n(.*?)\n```'
        match = re.search(sql_pattern, response_text, re.DOTALL)

        if match:
            return match.group(1).strip()

        # Fallback: look for any code block
        code_pattern = r'```\n(.*?)\n```'
        match = re.search(code_pattern, response_text, re.DOTALL)

        if match:
            return match.group(1).strip()

        return None

    def display_sql(self, sql: str):
        """
        Display SQL with syntax highlighting.

        Args:
            sql: SQL query to display
        """
        syntax = Syntax(
            sql,
            "sql",
            theme="monokai",
            line_numbers=False,
            word_wrap=True
        )
        self.console.print("\n[bold]Generated SQL:[/bold]")
        self.console.print(syntax)

    def display_result(self, response_text: str, format_type: str = 'full'):
        """
        Display final result in specified format.

        Args:
            response_text: Complete response text
            format_type: 'sql-only', 'full', or 'json'
        """
        sql = self.extract_sql(response_text)

        if format_type == 'sql-only':
            if sql:
                self.console.print(sql)
            else:
                self.console.print(response_text)

        elif format_type == 'full':
            # Already displayed during streaming
            if sql:
                self.console.print("\n" + "="*60)
                self.display_sql(sql)

        elif format_type == 'json':
            import json
            result = {
                'sql': sql,
                'full_response': response_text
            }
            self.console.print(json.dumps(result, indent=2, ensure_ascii=False))

    def display_error(self, error_msg: str):
        """
        Display error message.

        Args:
            error_msg: Error message to display
        """
        self.console.print(
            f"\n[bold red]Error:[/bold red] {error_msg}",
            style='red'
        )
