"""
Migration: add watched_at to watchlist table
Hỗ trợ cả SQLite và PostgreSQL.

Chạy từ thư mục backend:
    python migrations/add_watched_at_to_watchlist.py
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text, inspect
from app.database.connection import engine


def column_exists(table: str, column: str) -> bool:
    """Kiểm tra cột có tồn tại không — hoạt động với cả SQLite và PostgreSQL."""
    inspector = inspect(engine)
    cols = [c["name"] for c in inspector.get_columns(table)]
    return column in cols


def upgrade():
    if column_exists("watchlist", "watched_at"):
        print("✅ Cột 'watched_at' đã tồn tại, bỏ qua.")
        return

    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE watchlist ADD COLUMN watched_at DATETIME NULL"
        ))
        conn.commit()
    print("✅ Đã thêm cột 'watched_at' vào bảng 'watchlist'.")


def downgrade():
    dialect = engine.dialect.name
    if dialect == "sqlite":
        print("⚠️  SQLite không hỗ trợ DROP COLUMN trực tiếp.")
        print("   Hãy xóa file .db và để SQLAlchemy tạo lại schema từ model.")
    else:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE watchlist DROP COLUMN IF EXISTS watched_at"
            ))
            conn.commit()
        print("✅ Đã xóa cột 'watched_at'.")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "upgrade"
    if action == "downgrade":
        downgrade()
    else:
        upgrade()