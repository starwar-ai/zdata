"""
DDL Optimizer - DDL优化主模块
"""

from typing import Dict, Optional
from .parser import DDLParser, Table
from .formatters import (
    CompactFormatter,
    JSONFormatter,
    MarkdownFormatter,
    LayeredFormatter,
    ERDFormatter,
    MinimalFormatter
)


class DDLOptimizer:
    """DDL优化器"""

    FORMATTERS = {
        'compact': CompactFormatter,
        'json': JSONFormatter,
        'markdown': MarkdownFormatter,
        'layered': LayeredFormatter,
        'erd': ERDFormatter,
        'minimal': MinimalFormatter
    }

    def __init__(self):
        self.parser = DDLParser()
        self.tables: Dict[str, Table] = {}

    def optimize_file(self, file_path: str, format_type: str = 'compact') -> str:
        """
        优化DDL文件

        Args:
            file_path: DDL文件路径
            format_type: 输出格式 (compact|json|markdown|layered|erd|minimal)

        Returns:
            优化后的DDL字符串
        """
        self.tables = self.parser.parse_file(file_path)
        return self.format(format_type)

    def optimize_text(self, ddl_text: str, format_type: str = 'compact') -> str:
        """
        优化DDL文本

        Args:
            ddl_text: DDL文本
            format_type: 输出格式 (compact|json|markdown|layered|erd|minimal)

        Returns:
            优化后的DDL字符串
        """
        self.tables = self.parser.parse(ddl_text)
        return self.format(format_type)

    def format(self, format_type: str = 'compact') -> str:
        """
        格式化已解析的表结构

        Args:
            format_type: 输出格式

        Returns:
            格式化后的字符串
        """
        if format_type not in self.FORMATTERS:
            raise ValueError(f"Unknown format type: {format_type}. "
                           f"Available formats: {', '.join(self.FORMATTERS.keys())}")

        formatter_class = self.FORMATTERS[format_type]
        formatter = formatter_class()
        return formatter.format(self.tables)

    def get_table_count(self) -> int:
        """获取表数量"""
        return len(self.tables)

    def get_table_names(self) -> list:
        """获取所有表名"""
        return list(self.tables.keys())

    def get_table(self, table_name: str) -> Optional[Table]:
        """获取指定表"""
        return self.tables.get(table_name)

    def filter_tables(self, table_names: list) -> 'DDLOptimizer':
        """
        过滤只保留指定的表

        Args:
            table_names: 要保留的表名列表

        Returns:
            新的DDLOptimizer实例
        """
        new_optimizer = DDLOptimizer()
        new_optimizer.tables = {
            name: table for name, table in self.tables.items()
            if name in table_names
        }
        return new_optimizer

    def exclude_tables(self, table_names: list) -> 'DDLOptimizer':
        """
        排除指定的表

        Args:
            table_names: 要排除的表名列表

        Returns:
            新的DDLOptimizer实例
        """
        new_optimizer = DDLOptimizer()
        new_optimizer.tables = {
            name: table for name, table in self.tables.items()
            if name not in table_names
        }
        return new_optimizer

    def get_statistics(self) -> dict:
        """
        获取DDL统计信息

        Returns:
            统计信息字典
        """
        total_columns = sum(len(table.columns) for table in self.tables.values())
        total_indexes = sum(len(table.indexes) for table in self.tables.values())
        total_fks = sum(len(table.foreign_keys) for table in self.tables.values())

        return {
            'total_tables': len(self.tables),
            'total_columns': total_columns,
            'total_indexes': total_indexes,
            'total_foreign_keys': total_fks,
            'avg_columns_per_table': round(total_columns / len(self.tables), 2) if self.tables else 0
        }

    @staticmethod
    def list_formats() -> dict:
        """
        列出所有可用的格式及其描述

        Returns:
            格式描述字典
        """
        return {
            'compact': '紧凑格式 - 类似编程语言的结构体定义',
            'json': 'JSON格式 - 适合程序处理',
            'markdown': 'Markdown表格 - 适合文档展示',
            'layered': '分层格式 - 按重要性分层展示',
            'erd': 'ERD文本 - 实体关系图文本描述',
            'minimal': '极简格式 - 最小化token使用'
        }
