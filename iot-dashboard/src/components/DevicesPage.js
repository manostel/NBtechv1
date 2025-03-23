import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import "./DevicesPage.css";

export default function DevicesPage({ user, onSelectDevice }) {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);

  const API_URL =
    "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";

  // Fetch data, group by ClientID, and compute status ("Online" if active, "Offline" otherwise)
  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_URL}?limit=50`);
      const { data } = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const deviceMap = {};
        data.forEach((entry) => {
          const key = entry.ClientID;
          const lastTimestamp = new Date(entry.timestamp);
          const now = new Date();
          const timeDiff = (now - lastTimestamp) / 1000;
          // Use "Online" if active (within 60 seconds), "Offline" otherwise.
          const status = timeDiff <= 60 ? "Online" : "Offline";

          if (!deviceMap[key]) {
            deviceMap[key] = { ...entry, status };
          }
        });
        setDevices(Object.values(deviceMap));
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceClick = (dev) => {
    onSelectDevice(dev);
    navigate("/dashboard");
  };

  return (
    <div className="devices-container">
      <h1>Your Devices</h1>
      <div className="devices-grid">
        {devices.map((dev) => (
          <div
            key={dev.ClientID}
            className="device-block"
            onClick={() => handleDeviceClick(dev)}
          >
            {/* Display ClientID first (value only) */}
            <h2>{dev.ClientID}</h2>
            {/* Then the device name */}
            <p>{dev.device}</p>
            {/* Status with icon */}
            <p className="device-status">
              {dev.status === "Online" ? (
                <span className="status online">
                  <FaCheckCircle size={16} /> Online
                </span>
              ) : (
                <span className="status offline">
                  <FaTimesCircle size={16} /> Offline
                </span>
              )}
            </p>
            <div className="device-indicators">
              <BatteryIndicator battery={dev.battery} />
              <SignalIndicator signal={dev.signal_quality} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
