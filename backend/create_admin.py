import sys
import os

# Đảm bảo import được app/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal, engine
from app.database.base import Base
from app.models.user import User, UserRole
from app.utils.security import hash_password

# ── Thông tin tài khoản admin test ────────────────────────
ADMIN_EMAIL    = "admin@test.com"
ADMIN_PASSWORD = "Admin@123"
ADMIN_USERNAME = "admin"
# ─────────────────────────────────────────────────────────

def main():
    # Tạo bảng nếu chưa có (chạy lần đầu)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()

        if existing:
            # Tài khoản đã tồn tại → chỉ nâng role
            existing.role      = UserRole.admin
            existing.is_banned = False
            db.commit()
            print(f"✅ Đã nâng quyền tài khoản '{ADMIN_EMAIL}' lên admin.")
        else:
            # Tạo mới
            user = User(
                email    = ADMIN_EMAIL,
                password = hash_password(ADMIN_PASSWORD),
                username = ADMIN_USERNAME,
                role     = UserRole.admin,
                avatar   = "⚡",
            )
            db.add(user)
            db.commit()
            print(f"✅ Đã tạo tài khoản admin mới.")

        print()
        print("─" * 40)
        print(f"  Email   : {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print(f"  Role    : admin")
        print("─" * 40)
        print("Truy cập: http://localhost:5173/login")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()