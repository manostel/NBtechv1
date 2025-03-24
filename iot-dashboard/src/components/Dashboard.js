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
import { FaCog } from "react-icons/fa";
import { MdRefresh } from "react-icons/md"; // reset icon
import "./Dashboard.css";
import DeviceInfoCard from "./DeviceInfoCard";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";

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
  const [speedInput, setSpeedInput] = useState("");

  // Module toggles for commands and charts
  const [showCharts, setShowCharts] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  const API_URL =
    "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";
  const COMMAND_API_URL =
    "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

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
        setDeviceStatus(timeDiff <= 60 ? "Active" : "Inactive");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const sendCommand = async (action, additionalData = {}) => {
    try {
      const payload = { ClientID: clientID, action, ...additionalData };
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
    setRestartClicked(true);
    await sendCommand("RESTART");
    setTimeout(() => setRestartClicked(false), 500);
  };

  const handleSendSpeed = async () => {
    if (speedInput.trim() !== "") {
      await sendCommand("SET_SPEED", { speed: speedInput });
      setSpeedInput("");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="dashboard dark-mode">
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
      </Helmet>

      {/* Module toggles row with indicators */}
      <section className="module-toggles">
        <div className="module-buttons">
          <button
            onClick={() => setShowCommands((prev) => !prev)}
            className="toggle-module"
          >
            {showCommands ? "Hide Commands" : "Show Commands"}
          </button>
          <button
            onClick={() => setShowCharts((prev) => !prev)}
            className="toggle-module"
          >
            {showCharts ? "Hide Charts" : "Show Charts"}
          </button>
        </div>
        <div className="module-indicators">
          <BatteryIndicator battery={batteryData.length ? batteryData[0] : 0} />
          <SignalIndicator signal={signalQualityData.length ? signalQualityData[0] : 0} />
        </div>
      </section>

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
          <button
            onClick={() => navigate("/settings")}
            className="settings-button"
          >
            <FaCog size={24} />
          </button>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="device-info">
          <DeviceInfoCard
            clientID={clientID}
            device={deviceName}
            status={deviceStatus}
            lastOnline={lastSeen ? lastSeen.toLocaleString() : "N/A"}
          />
        </section>

        {showCommands && (
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
              <MdRefresh size={24} className="icon" />
            </button>
            <div className="command-input">
              <input
                type="text"
                placeholder="Set Speed"
                value={speedInput}
                onChange={(e) => setSpeedInput(e.target.value)}
              />
              <button onClick={handleSendSpeed}>Send</button>
            </div>
          </section>
        )}

        {showCharts && (
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
        )}
      </main>
    </div>
  );
}
