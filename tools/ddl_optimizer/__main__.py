"""
使Python包可以作为模块运行
python -m ddl_optimizer.cli
"""

from .cli import main
import sys

if __name__ == '__main__':
    sys.exit(main())
