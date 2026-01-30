"""
Configuration management for nl2sql tool
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv


class Config:
    """Configuration manager for nl2sql tool"""

    def __init__(self, config_path: str = None):
        """
        Initialize configuration.

        Args:
            config_path: Path to nl2sql.yaml config file.
                        If None, uses default location.
        """
        # Load environment variables
        load_dotenv()

        # Determine config file path
        if config_path is None:
            # Default to /home/user/zdata/config/nl2sql.yaml
            base_dir = Path(__file__).parent.parent.parent
            config_path = base_dir / 'config' / 'nl2sql.yaml'

        self.config_path = Path(config_path)
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        if not self.config_path.exists():
            raise FileNotFoundError(
                f"Configuration file not found: {self.config_path}"
            )

        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        return config

    def get_api_key(self) -> str:
        """Get Anthropic API key from environment"""
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY not found in environment. "
                "Please set it in .env file."
            )
        return api_key

    def get_model_id(self, model_name: str = None) -> str:
        """
        Get Claude model ID.

        Args:
            model_name: 'opus' or 'sonnet'. If None, uses default.

        Returns:
            Full model ID string
        """
        if model_name is None:
            model_name = self._config['model']['default']

        if model_name == 'opus':
            return self._config['model']['opus_id']
        elif model_name == 'sonnet':
            return self._config['model']['sonnet_id']
        else:
            raise ValueError(f"Unknown model: {model_name}")

    def get_max_tokens(self) -> int:
        """Get maximum tokens for API calls"""
        return self._config['model']['max_tokens']

    def get_temperature(self) -> float:
        """Get temperature for API calls"""
        return self._config['model']['temperature']

    def get_ddl_format(self) -> str:
        """Get default DDL format"""
        return self._config['ddl']['default_format']

    def get_output_format(self) -> str:
        """Get default output format"""
        return self._config['output']['default_format']

    def is_thinking_enabled(self) -> bool:
        """Check if thinking mode is enabled by default"""
        return self._config['thinking']['enabled']

    def show_thinking_by_default(self) -> bool:
        """Check if thinking should be shown by default"""
        return self._config['thinking']['show_by_default']

    def get_thinking_style(self) -> str:
        """Get thinking display style"""
        return self._config['thinking']['style']

    def get_timeout(self) -> int:
        """Get API timeout in seconds"""
        return self._config['api']['timeout']

    def get_retry_attempts(self) -> int:
        """Get number of retry attempts"""
        return self._config['api']['retry_attempts']

    def get_retry_delay(self) -> int:
        """Get retry delay in seconds"""
        return self._config['api']['retry_delay']

    def get(self, key_path: str, default=None) -> Any:
        """
        Get configuration value by dot-separated path.

        Args:
            key_path: Dot-separated path (e.g., 'model.default')
            default: Default value if key not found

        Returns:
            Configuration value
        """
        keys = key_path.split('.')
        value = self._config

        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default

        return value
