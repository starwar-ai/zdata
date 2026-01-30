"""
DDL Parser - 解析MySQL DDL语句
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class Column:
    """列信息"""
    name: str
    data_type: str
    length: Optional[str] = None
    nullable: bool = True
    default: Optional[str] = None
    auto_increment: bool = False
    comment: Optional[str] = None

    def __str__(self):
        return f"{self.name}: {self.data_type}"


@dataclass
class Index:
    """索引信息"""
    name: str
    columns: List[str]
    index_type: str  # PRIMARY, UNIQUE, INDEX, FULLTEXT

    def __str__(self):
        cols = ', '.join(self.columns)
        return f"{self.index_type} {self.name}({cols})"


@dataclass
class ForeignKey:
    """外键信息"""
    name: str
    columns: List[str]
    ref_table: str
    ref_columns: List[str]

    def __str__(self):
        cols = ', '.join(self.columns)
        ref_cols = ', '.join(self.ref_columns)
        return f"FK {self.name}: {cols} -> {self.ref_table}({ref_cols})"


@dataclass
class Table:
    """表信息"""
    name: str
    columns: List[Column] = field(default_factory=list)
    primary_keys: List[str] = field(default_factory=list)
    indexes: List[Index] = field(default_factory=list)
    foreign_keys: List[ForeignKey] = field(default_factory=list)
    comment: Optional[str] = None
    engine: Optional[str] = None
    charset: Optional[str] = None

    def get_column(self, name: str) -> Optional[Column]:
        """获取指定列"""
        for col in self.columns:
            if col.name == name:
                return col
        return None


class DDLParser:
    """DDL解析器"""

    def __init__(self):
        self.tables: Dict[str, Table] = {}

    def parse_file(self, file_path: str) -> Dict[str, Table]:
        """解析DDL文件"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return self.parse(content)

    def parse(self, ddl_text: str) -> Dict[str, Table]:
        """解析DDL文本"""
        # 移除注释
        ddl_text = self._remove_comments(ddl_text)

        # 提取CREATE TABLE语句
        create_tables = self._extract_create_tables(ddl_text)

        for create_sql in create_tables:
            table = self._parse_create_table(create_sql)
            if table:
                self.tables[table.name] = table

        return self.tables

    def _remove_comments(self, text: str) -> str:
        """移除SQL注释"""
        # 移除单行注释
        text = re.sub(r'--.*?$', '', text, flags=re.MULTILINE)
        # 移除多行注释
        text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
        return text

    def _extract_create_tables(self, text: str) -> List[str]:
        """提取所有CREATE TABLE语句"""
        # 改进的正则表达式，更灵活地匹配各种格式
        # 使用更简单的方式：找到CREATE TABLE开始，找到对应的分号结束
        create_statements = []

        # 先找到所有CREATE TABLE的位置
        pattern = r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\('

        matches = list(re.finditer(pattern, text, re.IGNORECASE))

        for i, match in enumerate(matches):
            start = match.start()
            # 找到对应的结束分号（在下一个CREATE TABLE之前或文本结束）
            if i + 1 < len(matches):
                # 在下一个CREATE TABLE之前搜索最后一个分号
                end_search = text[start:matches[i+1].start()]
            else:
                # 这是最后一个CREATE TABLE
                end_search = text[start:]

            # 找到最后一个分号
            semicolon_pos = end_search.rfind(';')
            if semicolon_pos != -1:
                end = start + semicolon_pos + 1
                create_sql = text[start:end]
                create_statements.append(create_sql)

        return create_statements

    def _parse_create_table(self, create_sql: str) -> Optional[Table]:
        """解析单个CREATE TABLE语句"""
        # 提取表名
        table_name_match = re.search(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?',
            create_sql,
            re.IGNORECASE
        )
        if not table_name_match:
            return None

        table_name = table_name_match.group(1)

        # 提取表体
        body_match = re.search(r'\((.*)\)', create_sql, re.DOTALL)
        if not body_match:
            return None

        body = body_match.group(1)

        # 提取表选项（更灵活的匹配）
        engine_match = re.search(r'ENGINE\s*=?\s*(\w+)', create_sql, re.IGNORECASE)
        charset_match = re.search(r'(?:CHARSET|CHARACTER\s+SET)\s*=?\s*(\w+)', create_sql, re.IGNORECASE)
        comment_match = re.search(r'COMMENT\s*=?\s*[\'"]([^\'"]*)[\'"]', create_sql, re.IGNORECASE)

        table = Table(
            name=table_name,
            engine=engine_match.group(1) if engine_match else None,
            charset=charset_match.group(1) if charset_match else None,
            comment=comment_match.group(1) if comment_match else None
        )

        # 解析表体
        self._parse_table_body(body, table)

        return table

    def _parse_table_body(self, body: str, table: Table):
        """解析表体（列定义和约束）"""
        # 分割成行（处理逗号分隔）
        lines = self._split_definitions(body)

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 判断是列定义还是约束定义
            if line.upper().startswith('PRIMARY KEY'):
                self._parse_primary_key(line, table)
            elif line.upper().startswith('UNIQUE KEY') or line.upper().startswith('UNIQUE INDEX'):
                self._parse_unique_key(line, table)
            elif line.upper().startswith('KEY') or line.upper().startswith('INDEX'):
                self._parse_index(line, table)
            elif line.upper().startswith('CONSTRAINT') or 'FOREIGN KEY' in line.upper():
                self._parse_foreign_key(line, table)
            else:
                # 列定义
                column = self._parse_column(line)
                if column:
                    table.columns.append(column)

    def _split_definitions(self, body: str) -> List[str]:
        """分割定义（处理嵌套括号）"""
        definitions = []
        current = []
        paren_depth = 0

        for char in body:
            if char == '(':
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
            elif char == ',' and paren_depth == 0:
                definitions.append(''.join(current))
                current = []
                continue
            current.append(char)

        if current:
            definitions.append(''.join(current))

        return definitions

    def _parse_column(self, line: str) -> Optional[Column]:
        """解析列定义"""
        # 基本格式: `column_name` type [NULL|NOT NULL] [DEFAULT value] [AUTO_INCREMENT] [COMMENT 'xxx']

        # 提取列名
        col_name_match = re.match(r'`?(\w+)`?\s+', line)
        if not col_name_match:
            return None

        col_name = col_name_match.group(1)
        rest = line[col_name_match.end():]

        # 提取数据类型
        type_match = re.match(r'(\w+)(?:\(([^)]+)\))?', rest)
        if not type_match:
            return None

        data_type = type_match.group(1)
        length = type_match.group(2)

        # 检查属性
        nullable = 'NOT NULL' not in rest.upper()
        auto_increment = 'AUTO_INCREMENT' in rest.upper()

        # 提取默认值
        default = None
        default_match = re.search(r'DEFAULT\s+([^\s,]+)', rest, re.IGNORECASE)
        if default_match:
            default = default_match.group(1).strip("'\"")

        # 提取注释
        comment = None
        comment_match = re.search(r'COMMENT\s+[\'"]([^\'"]*)[\'"]', rest, re.IGNORECASE)
        if comment_match:
            comment = comment_match.group(1)

        return Column(
            name=col_name,
            data_type=data_type,
            length=length,
            nullable=nullable,
            default=default,
            auto_increment=auto_increment,
            comment=comment
        )

    def _parse_primary_key(self, line: str, table: Table):
        """解析主键"""
        cols_match = re.search(r'PRIMARY KEY\s*\(([^)]+)\)', line, re.IGNORECASE)
        if cols_match:
            cols = [c.strip().strip('`') for c in cols_match.group(1).split(',')]
            table.primary_keys = cols
            table.indexes.append(Index(
                name='PRIMARY',
                columns=cols,
                index_type='PRIMARY'
            ))

    def _parse_unique_key(self, line: str, table: Table):
        """解析唯一索引"""
        match = re.search(
            r'UNIQUE\s+(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)',
            line,
            re.IGNORECASE
        )
        if match:
            index_name = match.group(1)
            cols = [c.strip().strip('`') for c in match.group(2).split(',')]
            table.indexes.append(Index(
                name=index_name,
                columns=cols,
                index_type='UNIQUE'
            ))

    def _parse_index(self, line: str, table: Table):
        """解析普通索引"""
        match = re.search(
            r'(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)',
            line,
            re.IGNORECASE
        )
        if match:
            index_name = match.group(1)
            cols = [c.strip().strip('`') for c in match.group(2).split(',')]
            table.indexes.append(Index(
                name=index_name,
                columns=cols,
                index_type='INDEX'
            ))

    def _parse_foreign_key(self, line: str, table: Table):
        """解析外键"""
        match = re.search(
            r'(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)',
            line,
            re.IGNORECASE
        )
        if match:
            fk_name = match.group(1) or f'fk_{table.name}'
            cols = [c.strip().strip('`') for c in match.group(2).split(',')]
            ref_table = match.group(3)
            ref_cols = [c.strip().strip('`') for c in match.group(4).split(',')]

            table.foreign_keys.append(ForeignKey(
                name=fk_name,
                columns=cols,
                ref_table=ref_table,
                ref_columns=ref_cols
            ))
