import React from "react";
import "./DeviceInfoCard.css";

export default function DeviceInfoCard({ clientID, device, status, lastOnline }) {
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
        <span className="value">{status.replace("✅ ", "").replace("❌ ", "")}</span>
      </div>
      <div className="info-row">
        <span className="label">Last Online:</span>
        <span className="value">{lastOnline}</span>
      </div>
    </div>
  );
}
