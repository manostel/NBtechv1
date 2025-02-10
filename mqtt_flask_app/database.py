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
        SELECT client_id, device, timestamp, temperature, humidity
        FROM sensor_data
        ORDER BY timestamp DESC
        LIMIT 100
    """)
    
    data = cursor.fetchall()
    conn.close()
    
    return [{"client_id": row[0], "device": row[1], "timestamp": row[2], "temperature": row[3], "humidity": row[4]} for row in data]

# Function to create the table (runs once)
def initialize_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT,
            device TEXT,
            timestamp TEXT,
            temperature REAL,
            humidity REAL
        )
    """)
    
    conn.commit()
    conn.close()

def insert_data(client_id, device, timestamp, temperature, humidity):
    """Ensure timestamps are stored in correct format."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Convert timestamp format if needed
    formatted_timestamp = timestamp if "T" in timestamp else datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO sensor_data (client_id, device, timestamp, temperature, humidity)
        VALUES (?, ?, ?, ?, ?)
    """, (client_id, device, formatted_timestamp, temperature, humidity))

    conn.commit()
    conn.close()


def fetch_latest_data(limit=10):
    """Retrieve the latest IoT sensor data from SQLite."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT client_id, device, timestamp, temperature, humidity
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
            "humidity": row[4]
        }
        for row in data
    ]


# Initialize the database on startup
initialize_db()
