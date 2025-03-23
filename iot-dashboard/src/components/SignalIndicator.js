import React from "react";
import { FaSignal } from "react-icons/fa";
import "./SignalIndicator.css";

export default function SignalIndicator({ signal }) {
  return (
    <div className="signal-indicator">
      <FaSignal size={16} className="signal-icon" />
      <div className="signal-bar">
        <div className="signal-level" style={{ width: `${signal}%` }}></div>
      </div>
    </div>
  );
}
