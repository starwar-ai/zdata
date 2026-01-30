"""
DDL Optimizer - 优化数据库DDL结构，减少LLM Token使用量

这个包提供了将冗长的DDL语句转换为多种紧凑格式的功能。
"""

from .parser import DDLParser
from .optimizer import DDLOptimizer
from .formatters import (
    CompactFormatter,
    JSONFormatter,
    MarkdownFormatter,
    LayeredFormatter,
    ERDFormatter
)

__version__ = "1.0.0"
__all__ = [
    'DDLParser',
    'DDLOptimizer',
    'CompactFormatter',
    'JSONFormatter',
    'MarkdownFormatter',
    'LayeredFormatter',
    'ERDFormatter'
]
