import React from "react";
import { FaCircle } from "react-icons/fa";
import "./DeviceInfoCard.css";

export default function DeviceInfoCard({ clientID, device, status, lastOnline }) {
  // Determine icon color based on status:
  const statusColor = status === "Active" ? "#4caf50" : "#f44336"; // green for Active (Online), red for Offline
  return (
    <div className="device-info-card">
      <div className="info-row">
        <span className="label">Client ID:</span>
        <span className="value">{clientID}</span>
      </div>
      <div className="info-row">
        <span className="label">Device:</span>
        <span className="value">{device}</span>
      </div>
      <div className="info-row">
        <span className="label">Status:</span>
        <span className="value">
          <FaCircle style={{ color: statusColor, marginRight: "5px" }} />
          {status === "Active" ? "Online" : "Offline"}
        </span>
      </div>
      <div className="info-row">
        <span className="label">Last Online:</span>
        <span className="value">{lastOnline}</span>
      </div>
    </div>
  );
}
