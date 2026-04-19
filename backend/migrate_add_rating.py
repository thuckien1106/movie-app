"""
Migration: thêm cột `rating` vào bảng `watchlist`

Chạy từ thư mục backend (cùng chỗ với file .env):
    python migrate_add_rating.py

Script tự động:
  - Tìm đúng file database qua DATABASE_URL trong .env
  - Kiểm tra xem cột đã tồn tại chưa (idempotent — chạy nhiều lần không bị lỗi)
  - Thêm cột nếu chưa có
"""

import sys
import os
import sqlite3


def get_db_path() -> str:
    """Đọc DATABASE_URL từ .env hoặc biến môi trường, trả về đường dẫn file SQLite."""

    # 1. Thử đọc từ biến môi trường (nếu đã set)
    db_url = os.environ.get("DATABASE_URL", "")

    # 2. Nếu chưa có, đọc thủ công từ .env
    if not db_url:
        env_file = ".env"
        if not os.path.exists(env_file):
            # Thử tìm .env ở thư mục cha
            env_file = os.path.join(os.path.dirname(__file__), ".env")

        if os.path.exists(env_file):
            with open(env_file, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL"):
                        _, _, val = line.partition("=")
                        db_url = val.strip().strip('"').strip("'")
                        break

    if not db_url:
        # Fallback mặc định hay gặp trong project này
        db_url = "sqlite:///./films.db"

    # Parse sqlite:///./path hoặc sqlite:////abs/path
    if not db_url.startswith("sqlite"):
        print(f"❌ DATABASE_URL không phải SQLite: {db_url}")
        print("   Script này chỉ hỗ trợ SQLite. Với PostgreSQL dùng Alembic.")
        sys.exit(1)

    # sqlite:///./films.db  → ./films.db
    # sqlite:////abs/path   → /abs/path
    path = db_url.replace("sqlite:///", "")
    return path


def migrate(db_path: str) -> None:
    print(f"📂 Database: {os.path.abspath(db_path)}")

    if not os.path.exists(db_path):
        print(f"❌ Không tìm thấy file database: {db_path}")
        print("   Hãy đảm bảo bạn đang chạy script từ thư mục backend.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Kiểm tra các cột hiện có của bảng watchlist
        cursor.execute("PRAGMA table_info(watchlist)")
        columns = {row[1] for row in cursor.fetchall()}

        if "rating" in columns:
            print("✅ Cột `rating` đã tồn tại — không cần migration.")
            return

        print("➕ Đang thêm cột `rating INTEGER` vào bảng `watchlist`...")
        cursor.execute("ALTER TABLE watchlist ADD COLUMN rating INTEGER")
        conn.commit()
        print("✅ Migration thành công! Cột `rating` đã được thêm.")
        print()
        print("   Khởi động lại backend để áp dụng thay đổi.")

    except sqlite3.Error as e:
        print(f"❌ Lỗi SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    db_path = get_db_path()
    migrate(db_path)