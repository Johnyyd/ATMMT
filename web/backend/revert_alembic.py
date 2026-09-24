import sqlite3
try:
    conn = sqlite3.connect('/app/data/guestbook.db')
    conn.execute("UPDATE alembic_version SET version_num='3793f50c7d80'")
    conn.commit()
    print("Updated alembic_version successfully")
except Exception as e:
    print(e)
