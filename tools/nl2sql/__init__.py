"""
Natural Language to SQL CLI Tool

A command-line tool that converts natural language queries to SQL statements
using Claude AI with extended thinking mode support.
"""

__version__ = '1.0.0'
__author__ = 'Claude AI'

from .engine import NL2SQLEngine
from .llm_client import ClaudeClient
from .ddl_manager import DDLManager

__all__ = ['NL2SQLEngine', 'ClaudeClient', 'DDLManager']
