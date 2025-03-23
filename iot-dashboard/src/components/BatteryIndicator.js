import React from "react";
import { FaBatteryFull } from "react-icons/fa";
import "./BatteryIndicator.css";

export default function BatteryIndicator({ battery }) {
  return (
    <div className="battery-indicator">
      <FaBatteryFull size={16} className="battery-icon" />
      <div className="battery-bar">
        <div className="battery-level" style={{ width: `${battery}%` }}></div>
      </div>
    </div>
  );
}
