import sqlite3
import os

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./movie.db").replace("sqlite:///", "")

print("Using DB:", os.path.abspath(DB_PATH))  # debug

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      VARCHAR(255) UNIQUE NOT NULL,
    username   VARCHAR(50)  UNIQUE,
    password   VARCHAR(255),
    avatar     VARCHAR(10),
    bio        TEXT,
    google_id  VARCHAR(128) UNIQUE,
    avatar_url VARCHAR(500),
    is_google  BOOLEAN DEFAULT 0 NOT NULL
);

INSERT INTO users_new (id, email, username, password, avatar, bio)
SELECT id, email, username, password, avatar, bio FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS ix_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_username  ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id);

COMMIT;
PRAGMA foreign_keys = ON;
""")

conn.close()
print("Migration done!")