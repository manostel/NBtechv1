import sqlite3
import datetime
DB_NAME = "iot_database.db"
RECORD_LIMIT = 10000  # Keep only the latest 10,000 records

def enforce_record_limit():
    """Keep only the latest N records in the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM sensor_data WHERE id NOT IN (
            SELECT id FROM sensor_data ORDER BY timestamp DESC LIMIT ?
        )
    """, (RECORD_LIMIT,))
    
    conn.commit()
    conn.close()

def fetch_last_100_data():
    """Retrieve the last 100 IoT data points from SQLite."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT client_id, device, timestamp, temperature, humidity,  battery , signal_quality
        FROM sensor_data
        ORDER BY timestamp DESC
        LIMIT 1000
    """)
    
    data = cursor.fetchall()
    conn.close()
    
    return [{"client_id": row[0], "device": row[1], "timestamp": row[2], "temperature": row[3], "humidity": row[4], "battery": row[5], "signal_quality": row[6]} for row in data]

def fetch_last_timestamp():
    """Retrieve the latest timestamp from the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT 1;
    """)

    last_timestamp = cursor.fetchone()
    conn.close()

    return last_timestamp[0] if last_timestamp else None  # ✅ Return timestamp or None if no data


def initialize_db():
    """Ensure sensor_data table exists and has the required columns."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create the table if it does not exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT,
            device TEXT,
            timestamp TEXT,
            temperature REAL,
            humidity REAL,
            signal_quality INTEGER
        )
    """)

    # Check if the battery column exists
    cursor.execute("PRAGMA table_info(sensor_data);")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "battery" not in columns:
        cursor.execute("ALTER TABLE sensor_data ADD COLUMN battery INTEGER DEFAULT 100;")  # ✅ Add battery_level column
    if "signal_quality" not in columns:
        cursor.execute("ALTER TABLE sensor_data ADD COLUMN signal_quality INTEGER DEFAULT 0;")  # ✅ Add signal quality column


    conn.commit()
    conn.close()


def insert_data(client_id, device, timestamp, temperature, humidity, battery, signal_quality):
    """Insert IoT data into SQLite, including battery level and signal quality."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO sensor_data (client_id, device, timestamp, temperature, humidity, battery, signal_quality)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (client_id, device, timestamp, temperature, humidity, battery, signal_quality))

    conn.commit()
    conn.close()


def fetch_latest_data(limit=10):
    """Retrieve the latest IoT sensor data from SQLite."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT client_id, device, timestamp, temperature, humidity, battery, signal_quality
        FROM sensor_data
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))

    data = cursor.fetchall()
    conn.close()

    return [
        {
            "client_id": row[0],
            "device": row[1],
            "timestamp": row[2],
            "temperature": row[3],
            "humidity": row[4],
            "battery": row[5],
            "signal_quality": row[6]  # ✅ Include signal quality in response
        }
        for row in data
    ]



# Initialize the database on startup
initialize_db()
