"""
Claude API client with streaming and extended thinking support
"""

from typing import Iterator, Dict, Any
import anthropic


class ClaudeClient:
    """Client for interacting with Claude API"""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-opus-4-5-20251101",
        max_tokens: int = 4096,
        temperature: float = 0.0
    ):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key
            model: Claude model ID
            max_tokens: Maximum tokens for response
            temperature: Temperature for generation (0.0 for deterministic)
        """
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

    def generate_sql_stream(
        self,
        system_prompt: str,
        user_query: str,
        use_thinking: bool = True
    ) -> Iterator[Dict[str, Any]]:
        """
        Stream SQL generation with thinking process.

        Args:
            system_prompt: System prompt with DDL context
            user_query: User's natural language query
            use_thinking: Enable extended thinking mode

        Yields:
            Dict with event information:
            - {'type': 'block_start', 'block_type': 'thinking'|'text'}
            - {'type': 'thinking', 'content': str}
            - {'type': 'text', 'content': str}
            - {'type': 'block_stop'}
        """
        try:
            # Create streaming message with extended thinking
            params = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_query}]
            }

            # Add extended thinking if enabled
            if use_thinking:
                params["thinking"] = {
                    "type": "enabled",
                    "budget_tokens": 2000
                }

            with self.client.messages.stream(**params) as stream:
                for event in stream:
                    # Handle different stream event types
                    if event.type == "content_block_start":
                        # Start of a new content block (thinking or text)
                        block_type = event.content_block.type
                        yield {
                            'type': 'block_start',
                            'block_type': block_type
                        }

                    elif event.type == "content_block_delta":
                        # Incremental content update
                        delta = event.delta

                        if delta.type == "thinking_delta":
                            # Thinking content
                            yield {
                                'type': 'thinking',
                                'content': delta.thinking
                            }

                        elif delta.type == "text_delta":
                            # Text content
                            yield {
                                'type': 'text',
                                'content': delta.text
                            }

                    elif event.type == "content_block_stop":
                        # End of content block
                        yield {
                            'type': 'block_stop'
                        }

                    elif event.type == "message_stop":
                        # End of message
                        yield {
                            'type': 'message_stop'
                        }

        except anthropic.APIError as e:
            yield {
                'type': 'error',
                'error': str(e),
                'error_type': 'api_error'
            }
        except Exception as e:
            yield {
                'type': 'error',
                'error': str(e),
                'error_type': 'unknown_error'
            }

    def generate_sql(
        self,
        system_prompt: str,
        user_query: str,
        use_thinking: bool = True
    ) -> str:
        """
        Generate SQL without streaming (synchronous).

        Args:
            system_prompt: System prompt with DDL context
            user_query: User's natural language query
            use_thinking: Enable extended thinking mode

        Returns:
            Generated SQL response text
        """
        # Collect all text from stream
        text_parts = []
        for event in self.generate_sql_stream(system_prompt, user_query, use_thinking):
            if event['type'] == 'text':
                text_parts.append(event['content'])
            elif event['type'] == 'error':
                raise Exception(f"{event['error_type']}: {event['error']}")

        return ''.join(text_parts)
