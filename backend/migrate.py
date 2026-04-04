"""
Chạy script này 1 lần để thêm cột avatar và bio vào bảng users.
Đặt file này cạnh thư mục app/ rồi chạy: python migrate.py
"""
import sqlite3
import os
import sys

# Tìm file .db — thử các đường dẫn phổ biến
CANDIDATES = [
    "app.db", "database.db", "db.sqlite3", "sqlite.db",
    os.path.join("app", "app.db"),
    os.path.join("app", "database.db"),
]

db_path = None
for c in CANDIDATES:
    if os.path.exists(c):
        db_path = c
        break

if db_path is None:
    # Tìm bất kỳ file .db nào trong thư mục hiện tại và con
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d != "venv" and not d.startswith(".")]
        for f in files:
            if f.endswith((".db", ".sqlite", ".sqlite3")):
                db_path = os.path.join(root, f)
                break
        if db_path:
            break

if db_path is None:
    print("❌ Không tìm thấy file SQLite database.")
    print("   Hãy chỉnh db_path trong script cho đúng đường dẫn.")
    sys.exit(1)

print(f"✅ Tìm thấy database: {db_path}")

conn = sqlite3.connect(db_path)
cur  = conn.cursor()

# Kiểm tra các cột đã tồn tại chưa
cur.execute("PRAGMA table_info(users)")
existing = {row[1] for row in cur.fetchall()}
print(f"   Cột hiện tại: {existing}")

added = []
if "avatar" not in existing:
    cur.execute("ALTER TABLE users ADD COLUMN avatar VARCHAR(10)")
    added.append("avatar")
if "bio" not in existing:
    cur.execute("ALTER TABLE users ADD COLUMN bio TEXT")
    added.append("bio")

conn.commit()
conn.close()

if added:
    print(f"✅ Đã thêm cột: {', '.join(added)}")
else:
    print("ℹ️  Các cột đã tồn tại, không cần thêm gì.")

print("🎉 Migration hoàn tất! Khởi động lại server là xong.")
