"""
Formatters - 各种输出格式化器
"""

import json
from abc import ABC, abstractmethod
from typing import Dict, List
from .parser import Table, Column, Index, ForeignKey


class BaseFormatter(ABC):
    """格式化器基类"""

    @abstractmethod
    def format(self, tables: Dict[str, Table]) -> str:
        """格式化表结构"""
        pass


class CompactFormatter(BaseFormatter):
    """紧凑格式化器"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成紧凑的DDL格式
        示例:
        users {
          id: bigint PK 用户ID
          username: varchar(50) UK 用户名
          email: varchar(100) IDX 邮箱
        }
        """
        result = []

        for table_name, table in tables.items():
            # 表头
            comment = f" -- {table.comment}" if table.comment else ""
            result.append(f"{table_name} {{{comment}")

            # 列
            for col in table.columns:
                line = f"  {col.name}: {self._format_type(col)}"

                # 添加约束标记
                constraints = self._get_column_constraints(col, table)
                if constraints:
                    line += f" {constraints}"

                # 添加注释
                if col.comment:
                    line += f" {col.comment}"

                result.append(line)

            # 外键关系
            if table.foreign_keys:
                result.append("")
                for fk in table.foreign_keys:
                    cols = ', '.join(fk.columns)
                    ref_cols = ', '.join(fk.ref_columns)
                    result.append(f"  FK: {cols} → {fk.ref_table}({ref_cols})")

            result.append("}")
            result.append("")

        return '\n'.join(result)

    def _format_type(self, col: Column) -> str:
        """格式化数据类型"""
        if col.length:
            return f"{col.data_type}({col.length})"
        return col.data_type

    def _get_column_constraints(self, col: Column, table: Table) -> str:
        """获取列约束标记"""
        constraints = []

        # 主键
        if col.name in table.primary_keys:
            constraints.append("PK")

        # 唯一索引
        for idx in table.indexes:
            if idx.index_type == 'UNIQUE' and col.name in idx.columns:
                constraints.append("UK")
                break

        # 普通索引
        for idx in table.indexes:
            if idx.index_type == 'INDEX' and col.name in idx.columns:
                constraints.append("IDX")
                break

        # 自增
        if col.auto_increment:
            constraints.append("AI")

        # 非空
        if not col.nullable and "PK" not in constraints:
            constraints.append("NN")

        return ' '.join(constraints)


class JSONFormatter(BaseFormatter):
    """JSON格式化器"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成JSON格式的schema
        示例:
        {
          "users": {
            "columns": {
              "id": "PK/bigint/用户ID",
              "username": "UK/varchar(50)/用户名"
            },
            "relations": ["orders.user_id"]
          }
        }
        """
        schema = {}

        for table_name, table in tables.items():
            columns = {}
            for col in table.columns:
                constraints = self._get_column_constraints(col, table)
                data_type = self._format_type(col)
                comment = col.comment or ""

                columns[col.name] = f"{constraints}/{data_type}/{comment}"

            # 收集外键关系
            relations = []
            for fk in table.foreign_keys:
                for col in fk.columns:
                    relations.append(f"{fk.ref_table}.{fk.ref_columns[0]}")

            # 收集被引用关系（通过扫描所有表的外键）
            referenced_by = []
            for other_table_name, other_table in tables.items():
                if other_table_name == table_name:
                    continue
                for fk in other_table.foreign_keys:
                    if fk.ref_table == table_name:
                        referenced_by.append(f"{other_table_name}.{fk.columns[0]}")

            schema[table_name] = {
                "comment": table.comment or "",
                "columns": columns,
                "relations": relations,
                "referenced_by": referenced_by
            }

        return json.dumps(schema, ensure_ascii=False, indent=2)

    def _format_type(self, col: Column) -> str:
        """格式化数据类型"""
        if col.length:
            return f"{col.data_type}({col.length})"
        return col.data_type

    def _get_column_constraints(self, col: Column, table: Table) -> str:
        """获取列约束标记"""
        constraints = []

        if col.name in table.primary_keys:
            constraints.append("PK")

        for idx in table.indexes:
            if idx.index_type == 'UNIQUE' and col.name in idx.columns:
                constraints.append("UK")
                break

        for idx in table.indexes:
            if idx.index_type == 'INDEX' and col.name in idx.columns:
                constraints.append("IDX")
                break

        if col.auto_increment:
            constraints.append("AI")

        return '/'.join(constraints) if constraints else ""


class MarkdownFormatter(BaseFormatter):
    """Markdown表格格式化器"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成Markdown表格格式
        | 表名 | 字段 | 类型 | 约束 | 说明 |
        |------|------|------|------|------|
        | users | id | bigint | PK | 用户ID |
        """
        result = []

        # 表头
        result.append("| 表名 | 字段 | 类型 | 约束 | 说明 |")
        result.append("|------|------|------|------|------|")

        # 数据行
        for table_name, table in tables.items():
            for i, col in enumerate(table.columns):
                # 第一列只在第一行显示表名
                table_cell = table_name if i == 0 else ""

                # 类型
                data_type = self._format_type(col)

                # 约束
                constraints = self._get_column_constraints(col, table)

                # 说明
                comment = col.comment or ""

                result.append(f"| {table_cell} | {col.name} | {data_type} | {constraints} | {comment} |")

        # 添加关系部分
        result.append("")
        result.append("## 表关系")
        result.append("")

        for table_name, table in tables.items():
            if table.foreign_keys:
                for fk in table.foreign_keys:
                    cols = ', '.join(fk.columns)
                    ref_cols = ', '.join(fk.ref_columns)
                    result.append(f"- `{table_name}.{cols}` → `{fk.ref_table}.{ref_cols}`")

        return '\n'.join(result)

    def _format_type(self, col: Column) -> str:
        """格式化数据类型"""
        if col.length:
            return f"{col.data_type}({col.length})"
        return col.data_type

    def _get_column_constraints(self, col: Column, table: Table) -> str:
        """获取列约束标记"""
        constraints = []

        if col.name in table.primary_keys:
            constraints.append("PK")

        for idx in table.indexes:
            if idx.index_type == 'UNIQUE' and col.name in idx.columns:
                constraints.append("UK")
                break

        for idx in table.indexes:
            if idx.index_type == 'INDEX' and col.name in idx.columns:
                constraints.append("IDX")
                break

        if col.auto_increment:
            constraints.append("AI")

        if not col.nullable and col.name not in table.primary_keys:
            constraints.append("NN")

        return ', '.join(constraints)


class LayeredFormatter(BaseFormatter):
    """分层格式化器"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成分层格式
        第一层: 表概览
        第二层: 核心字段
        第三层: 详细信息
        """
        result = []

        # 第一层：表概览
        result.append("=== 第一层：数据库表概览 ===")
        result.append("")
        table_names = list(tables.keys())
        result.append(f"共 {len(table_names)} 张表: {', '.join(table_names)}")
        result.append("")

        # 第二层：表结构（核心字段）
        result.append("=== 第二层：核心表结构 ===")
        result.append("")

        for table_name, table in tables.items():
            # 只显示主键、外键和带索引的字段
            core_cols = []
            for col in table.columns:
                if (col.name in table.primary_keys or
                    any(col.name in idx.columns for idx in table.indexes) or
                    any(col.name in fk.columns for fk in table.foreign_keys)):
                    core_cols.append(col)

            if core_cols:
                comment = f" -- {table.comment}" if table.comment else ""
                result.append(f"{table_name} {{{comment}")
                for col in core_cols:
                    constraints = self._get_column_constraints(col, table)
                    result.append(f"  {col.name}: {self._format_type(col)} {constraints}")
                result.append("}")
                result.append("")

        # 第三层：完整关系图
        result.append("=== 第三层：表关系详情 ===")
        result.append("")

        for table_name, table in tables.items():
            if table.foreign_keys:
                result.append(f"{table_name}:")
                for fk in table.foreign_keys:
                    cols = ', '.join(fk.columns)
                    ref_cols = ', '.join(fk.ref_columns)
                    result.append(f"  → {fk.ref_table} ({cols} → {ref_cols})")
                result.append("")

        return '\n'.join(result)

    def _format_type(self, col: Column) -> str:
        """格式化数据类型"""
        if col.length:
            return f"{col.data_type}({col.length})"
        return col.data_type

    def _get_column_constraints(self, col: Column, table: Table) -> str:
        """获取列约束标记"""
        constraints = []

        if col.name in table.primary_keys:
            constraints.append("PK")

        for idx in table.indexes:
            if idx.index_type == 'UNIQUE' and col.name in idx.columns:
                constraints.append("UK")
                break

        for idx in table.indexes:
            if idx.index_type == 'INDEX' and col.name in idx.columns:
                constraints.append("IDX")
                break

        for fk in table.foreign_keys:
            if col.name in fk.columns:
                constraints.append(f"FK→{fk.ref_table}")

        return ' '.join(constraints)


class ERDFormatter(BaseFormatter):
    """实体关系图文本格式化器"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成ERD文本描述
        更适合大模型理解的实体关系描述
        """
        result = []

        result.append("=== 实体关系描述 (ERD) ===")
        result.append("")

        # 核心实体
        result.append("## 核心实体：")
        result.append("")

        for table_name, table in tables.items():
            # 获取主键
            pk_cols = [col for col in table.columns if col.name in table.primary_keys]
            pk_str = ', '.join([f"{col.name}:{col.data_type}" for col in pk_cols])

            # 获取关键业务字段（有注释的非主键字段）
            biz_cols = [col for col in table.columns
                       if col.comment and col.name not in table.primary_keys][:3]  # 只取前3个
            biz_str = ', '.join([f"{col.name}" for col in biz_cols])

            comment = f" - {table.comment}" if table.comment else ""
            result.append(f"- **{table_name}**({pk_str}) [{biz_str}]{comment}")

        # 关系映射
        result.append("")
        result.append("## 关系映射：")
        result.append("")

        for table_name, table in tables.items():
            if table.foreign_keys:
                for fk in table.foreign_keys:
                    # 判断关系类型（简化判断）
                    relation_type = "1:N"  # 默认一对多
                    result.append(f"- {table_name}.{fk.columns[0]} → {fk.ref_table}.{fk.ref_columns[0]} ({relation_type})")

        # 索引提示（用于查询优化）
        result.append("")
        result.append("## 索引提示：")
        result.append("")

        for table_name, table in tables.items():
            indexes = [idx for idx in table.indexes if idx.index_type == 'INDEX']
            if indexes:
                result.append(f"{table_name}:")
                for idx in indexes:
                    cols = ', '.join(idx.columns)
                    result.append(f"  - {idx.name}: ({cols})")

        return '\n'.join(result)


class MinimalFormatter(BaseFormatter):
    """极简格式化器 - 最小化token使用"""

    def format(self, tables: Dict[str, Table]) -> str:
        """
        生成极简格式，只保留最核心的信息
        示例:
        users(id*,username!,email) → orders,profiles
        orders(id*,user_id>users) → order_items
        """
        result = []

        for table_name, table in tables.items():
            # 列信息
            cols = []
            for col in table.columns:
                col_str = col.name

                # 主键标记
                if col.name in table.primary_keys:
                    col_str += "*"
                # 唯一索引标记
                elif any(idx.index_type == 'UNIQUE' and col.name in idx.columns for idx in table.indexes):
                    col_str += "!"
                # 外键标记
                fk = next((fk for fk in table.foreign_keys if col.name in fk.columns), None)
                if fk:
                    col_str += f">{fk.ref_table}"

                cols.append(col_str)

            # 被引用的表
            referenced_by = []
            for other_table_name, other_table in tables.items():
                if other_table_name == table_name:
                    continue
                for fk in other_table.foreign_keys:
                    if fk.ref_table == table_name:
                        referenced_by.append(other_table_name)
                        break

            # 组装
            line = f"{table_name}({','.join(cols)})"
            if referenced_by:
                line += f" ← {','.join(set(referenced_by))}"

            # 添加注释（如果有）
            if table.comment:
                line += f" # {table.comment}"

            result.append(line)

        # 添加图例说明
        result.insert(0, "# 图例: * = PK, ! = UK, >table = FK, ← = 被引用")
        result.insert(1, "")

        return '\n'.join(result)
