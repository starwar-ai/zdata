"""
DDL management and optimization integration
"""

import sys
import yaml
from pathlib import Path
from typing import Optional

# Add parent directory to path to import ddl_optimizer
sys.path.insert(0, str(Path(__file__).parent.parent))

from ddl_optimizer import DDLOptimizer


class DDLManager:
    """Manages DDL loading and optimization"""

    def __init__(self, databases_config_path: str = None):
        """
        Initialize DDL manager.

        Args:
            databases_config_path: Path to databases.yaml.
                                  If None, uses default location.
        """
        if databases_config_path is None:
            base_dir = Path(__file__).parent.parent.parent
            databases_config_path = base_dir / 'config' / 'databases.yaml'

        self.databases_config_path = Path(databases_config_path)
        self.optimizer = DDLOptimizer()

    def load_ddl(
        self,
        source: str,
        source_type: str = 'file',
        format_type: str = 'erd'
    ) -> str:
        """
        Load and optimize DDL.

        Args:
            source: DDL file path or database name
            source_type: 'file' or 'db'
            format_type: DDL format ('erd', 'compact', 'minimal')

        Returns:
            Optimized DDL string

        Raises:
            FileNotFoundError: If DDL file not found
            ValueError: If database not found in config
        """
        if source_type == 'file':
            ddl_path = Path(source)
        elif source_type == 'db':
            ddl_path = self._get_ddl_path_from_db_config(source)
        else:
            raise ValueError(f"Invalid source_type: {source_type}")

        if not ddl_path.exists():
            raise FileNotFoundError(f"DDL file not found: {ddl_path}")

        # Use DDL Optimizer to optimize the DDL
        result = self.optimizer.optimize_file(
            str(ddl_path),
            format_type=format_type
        )

        return result

    def _get_ddl_path_from_db_config(self, db_name: str) -> Path:
        """
        Get DDL path from database configuration.

        Args:
            db_name: Database name from databases.yaml

        Returns:
            Path to DDL file

        Raises:
            FileNotFoundError: If databases.yaml not found
            ValueError: If database not found in config
        """
        if not self.databases_config_path.exists():
            raise FileNotFoundError(
                f"Database config not found: {self.databases_config_path}"
            )

        with open(self.databases_config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Get global ddlPath or database-specific ddlPath
        global_ddl_path = config.get('ddlPath')

        # Find database in config
        databases = config.get('databases', [])
        for db in databases:
            if db.get('name') == db_name:
                # Use database-specific ddlPath if available, otherwise use global
                ddl_path = db.get('ddlPath', global_ddl_path)

                if not ddl_path:
                    raise ValueError(
                        f"No ddlPath configured for database: {db_name}"
                    )

                # Resolve relative path from config directory
                if not Path(ddl_path).is_absolute():
                    base_dir = self.databases_config_path.parent.parent
                    ddl_path = base_dir / ddl_path

                return Path(ddl_path)

        raise ValueError(f"Database not found in config: {db_name}")

    def get_available_databases(self) -> list:
        """
        Get list of available database names from config.

        Returns:
            List of database names
        """
        if not self.databases_config_path.exists():
            return []

        with open(self.databases_config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        databases = config.get('databases', [])
        return [db.get('name') for db in databases if db.get('name')]
