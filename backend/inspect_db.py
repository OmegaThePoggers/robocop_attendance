import shutil
import sqlite3
import os
from datetime import datetime

def inspect():
    src = "attendance.db"
    dst = "attendance_debug.db"
    
    # Copy DB to avoid lock
    try:
        shutil.copy2(src, dst)
        print(f"Copied {src} to {dst}")
    except Exception as e:
        print(f"Error copying DB: {e}")
        return

    try:
        conn = sqlite3.connect(dst)
        c = conn.cursor()
        
        print("\n--- Sessions ---")
        try:
            c.execute("SELECT id, name, is_active, created_at, end_time FROM attendancesession")
            rows = c.fetchall()
            if not rows:
                print("No sessions found.")
            for r in rows:
                print(f"ID: {r[0]}, Name: {r[1]}, Active: {r[2]}, Created: {r[3]}, Ended: {r[4]}")
        except Exception as e:
            print(f"Error querying sessions: {e}")

        conn.close()
    except Exception as e:
        print(f"Error connecting to DB: {e}")
    finally:
        if os.path.exists(dst):
            os.remove(dst)
            print(f"Removed {dst}")

if __name__ == "__main__":
    inspect()
