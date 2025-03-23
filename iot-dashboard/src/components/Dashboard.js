import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
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
import { FaRedoAlt, FaCog } from "react-icons/fa";
import "./Dashboard.css";
import DeviceInfoCard from "./DeviceInfoCard";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";

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

export default function Dashboard({ user, device, onLogout, onBack }) {
  const navigate = useNavigate();

  // Force dark mode (optional)
  const [darkMode] = useState(true);

  // API & IoT data states
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
  const [restartClicked, setRestartClicked] = useState(false);

  const API_URL =
    "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";
  const COMMAND_API_URL =
    "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  // Fetch API data
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

        // Determine last online & status
        const lastTimestamp = timestamps[0];
        setLastSeen(lastTimestamp);

        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;
        setDeviceStatus(timeDiff <= 60 ? "Active" : "Inactive");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Send command to device
  const sendCommand = async (action) => {
    try {
      const payload = { ClientID: clientID, action };
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

  // Toggle handlers
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

  // Restart command handler
  const handleRestart = async () => {
    setRestartClicked(true);
    try {
      const payload = { ClientID: clientID, action: "RESTART" };
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
    setTimeout(() => setRestartClicked(false), 500);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Chart.js options for dark mode
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#f4f4f4" },
      },
      title: {
        display: true,
        text: "Real-time IoT Data",
        color: "#f4f4f4",
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "minute",
          tooltipFormat: "yyyy-MM-dd HH:mm:ss",
        },
        title: { display: true, text: "Time", color: "#f4f4f4" },
        ticks: { color: "#f4f4f4" },
        grid: { color: "rgba(255,255,255,0.3)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#f4f4f4" },
        grid: { color: "rgba(255,255,255,0.3)" },
      },
    },
  };

  return (
    <div className={`dashboard ${darkMode ? "dark-mode" : ""}`}>
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark/Light Mode" />
      </Helmet>

      {/* 
        Fixed indicators at the top-left. 
        This ensures they do NOT scroll with the page.
      */}
      <div className="left-sidebar">
        <BatteryIndicator battery={batteryData.length ? batteryData[0] : 0} />
        <SignalIndicator signal={signalQualityData.length ? signalQualityData[0] : 0} />
      </div>

      <header className="dashboard-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            Back to Devices
          </button>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">{user.email[0].toUpperCase()}</div>
            <span className="user-name">{user.email}</span>
          </div>
          <button onClick={() => navigate("/settings")} className="settings-button">
            <FaCog size={24} />
          </button>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* 
          Centered device info card 
        */}
        <section className="device-info">
          <DeviceInfoCard
            clientID={clientID}
            device={deviceName}
            status={deviceStatus}
            lastOnline={lastSeen ? lastSeen.toLocaleString() : "N/A"}
          />
        </section>

        {/* Toggles + Restart Button */}
        <section className="controls">
          <div className="control-item">
            <label className="switch">
              <input type="checkbox" checked={toggle1} onChange={handleToggle1} />
              <span className="slider"></span>
            </label>
            <span>Toggle 1</span>
          </div>
          <div className="control-item">
            <label className="switch">
              <input type="checkbox" checked={toggle2} onChange={handleToggle2} />
              <span className="slider"></span>
            </label>
            <span>Toggle 2</span>
          </div>
          <button
            onClick={handleRestart}
            className={`reset-button ${restartClicked ? "clicked" : ""}`}
          >
            <FaRedoAlt size={24} className="icon" />
          </button>
        </section>

        {/* 4 Charts in a grid */}
        <section className="charts">
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
        </section>
      </main>
    </div>
  );
}
