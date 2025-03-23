import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import "./Dashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

function Dashboard() {
  const [labels, setLabels] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [batteryData, setBatteryData] = useState([]);
  const [signalQualityData, setSignalQualityData] = useState([]);
  const [lastSeen, setLastSeen] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState("Offline");
  const [clientID, setClientID] = useState("Unknown");
  const [deviceName, setDeviceName] = useState("Unknown");
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const API_URL =
    "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";
  const COMMAND_API_URL =
    "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  // Fetch latest 50 records
  const fetchData = async () => {
    try {
      const url = `${API_URL}?limit=50`;
      const response = await fetch(url);
      const { data } = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const timestamps = data.map((entry) => new Date(entry.timestamp));
        const temperatures = data.map((entry) => parseFloat(entry.temperature));
        const humidities = data.map((entry) => parseFloat(entry.humidity));
        const batteries = data.map((entry) => parseFloat(entry.battery));
        const signals = data.map((entry) =>
          parseFloat(entry.signal_quality)
        );

        setClientID(data[0].ClientID || "Unknown");
        setDeviceName(data[0].device || "Unknown");

        setLabels(timestamps);
        setTemperatureData(temperatures);
        setHumidityData(humidities);
        setBatteryData(batteries);
        setSignalQualityData(signals);

        const lastTimestamp = timestamps[0];
        setLastSeen(lastTimestamp);

        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;
        setDeviceStatus(timeDiff <= 60 ? "✅ Active" : "❌ Offline");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Send command via API Gateway
  const sendCommand = async (action) => {
    try {
      const payload = {
        ClientID: clientID,
        action: action,
      };

      const response = await fetch(COMMAND_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("Command sent:", result);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  // Handlers for toggles and restart
  const handleToggle1 = () => {
    const newState = !toggle1;
    setToggle1(newState);
    sendCommand(newState ? "TOGGLE_1_ON" : "TOGGLE_1_OFF");
  };

  const handleToggle2 = () => {
    const newState = !toggle2;
    setToggle2(newState);
    sendCommand(newState ? "TOGGLE_2_ON" : "TOGGLE_2_OFF");
  };

  const handleRestart = async () => {
    try {
      const payload = {
        ClientID: clientID,
        action: "RESTART",
      };

      const response = await fetch(COMMAND_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("Restart command sent:", result);
    } catch (error) {
      console.error("Error sending restart command:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: darkMode ? "#f4f4f4" : "#333" },
      },
      title: {
        display: true,
        text: "Real-time IoT Data",
        color: darkMode ? "#f4f4f4" : "#333",
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "minute",
          tooltipFormat: "yyyy-MM-dd HH:mm:ss",
        },
        title: {
          display: true,
          text: "Time",
          color: darkMode ? "#f4f4f4" : "#333",
        },
        ticks: { color: darkMode ? "#f4f4f4" : "#333" },
        grid: { color: darkMode ? "rgba(255,255,255,0.3)" : "#ccc" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: darkMode ? "#f4f4f4" : "#333" },
        grid: { color: darkMode ? "rgba(255,255,255,0.3)" : "#ccc" },
      },
    },
  };
  

  return (
    <div className={`dashboard ${darkMode ? "dark-mode" : "light-mode"}`}>
      <h1>IoT Dashboard</h1>
      <p>
        <strong>Client ID:</strong> {clientID}
      </p>
      <p>
        <strong>Device:</strong> {deviceName}
      </p>
      <p>
        <strong>Status:</strong> {deviceStatus}
      </p>
      {lastSeen && (
        <p>
          <strong>Last Online:</strong> {lastSeen.toLocaleString()}
        </p>
      )}

      {/* Dark/Light Mode Toggle */}
      <div className="controls">
        <button
          className="mode-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
      </div>

      {/* Toggle Switches and Restart Button */}
      <div className="controls">
        <div>
          <label className="switch">
            <input type="checkbox" checked={toggle1} onChange={handleToggle1} />
            <span className="slider"></span>
          </label>
          <span>Toggle 1</span>
        </div>
        <div>
          <label className="switch">
            <input type="checkbox" checked={toggle2} onChange={handleToggle2} />
            <span className="slider"></span>
          </label>
          <span>Toggle 2</span>
        </div>
        <button onClick={handleRestart} className="reset-button">
          Restart Device
        </button>
      </div>

      <div className="charts">
        <div className="chart-container">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Temperature (°C)",
                  data: temperatureData,
                  borderColor: "red",
                  backgroundColor: "rgba(255, 99, 132, 0.2)",
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
        <div className="chart-container">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Humidity (%)",
                  data: humidityData,
                  borderColor: "blue",
                  backgroundColor: "rgba(54, 162, 235, 0.2)",
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
        <div className="chart-container">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Battery Level (%)",
                  data: batteryData,
                  borderColor: "green",
                  backgroundColor: "rgba(75, 192, 75, 0.2)",
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
        <div className="chart-container">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Signal Quality (%)",
                  data: signalQualityData,
                  borderColor: "purple",
                  backgroundColor: "rgba(128, 0, 128, 0.2)",
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
