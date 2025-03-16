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

  const API_URL = "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";
  const COMMAND_API_URL = "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/send-command";

  // Fetch latest 50 records
  const fetchData = async () => {
    try {
      let url = `${API_URL}?limit=50`;

      const response = await fetch(url);
      const { data } = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        // Extract data
        const timestamps = data.map(entry => new Date(entry.timestamp));
        const temperatures = data.map(entry => parseFloat(entry.temperature));
        const humidities = data.map(entry => parseFloat(entry.humidity));
        const batteries = data.map(entry => parseFloat(entry.battery));
        const signals = data.map(entry => parseFloat(entry.signal_quality));

        // Retrieve ClientID and Device Name
        setClientID(data[0].ClientID || "Unknown");
        setDeviceName(data[0].device || "Unknown");

        // Replace the existing data with the latest 50 records
        setLabels(timestamps);
        setTemperatureData(temperatures);
        setHumidityData(humidities);
        setBatteryData(batteries);
        setSignalQualityData(signals);

        // Determine last online time and status
        const lastTimestamp = timestamps[0];
        setLastSeen(lastTimestamp);

        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;

        if (timeDiff <= 60) {
          setDeviceStatus("✅ Active");
        } else {
          setDeviceStatus("❌ Offline");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Send command to AWS IoT Core via API Gateway
  const sendCommand = async (action) => {
    try {
      const payload = {
        ClientID: clientID,
        action: action  // "TOGGLE_1_ON", "TOGGLE_1_OFF"
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

  // Handle Toggle 1
  const handleToggle1 = () => {
    const newState = !toggle1;
    setToggle1(newState);
    sendCommand(newState ? "TOGGLE_1_ON" : "TOGGLE_1_OFF");
  };

  // Handle Toggle 2
  const handleToggle2 = () => {
    const newState = !toggle2;
    setToggle2(newState);
    sendCommand(newState ? "TOGGLE_2_ON" : "TOGGLE_2_OFF");
  };

  // Load data initially & refresh every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Real-time IoT Data" },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "minute", tooltipFormat: "yyyy-MM-dd HH:mm:ss" },
        title: { display: true, text: "Time" },
      },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="dashboard">
      <h1>IoT Dashboard</h1>
      <p><strong>Client ID:</strong> {clientID}</p>
      <p><strong>Device:</strong> {deviceName}</p>
      <p><strong>Status:</strong> {deviceStatus}</p>
      {lastSeen && <p><strong>Last Online:</strong> {lastSeen.toLocaleString()}</p>}
      
      {/* Toggle Switches */}
      <div className="toggles">
        <button onClick={handleToggle1} className={toggle1 ? "toggle-on" : "toggle-off"}>
          {toggle1 ? "TOGGLE 1 ON" : "TOGGLE 1 OFF"}
        </button>
        <button onClick={handleToggle2} className={toggle2 ? "toggle-on" : "toggle-off"}>
          {toggle2 ? "TOGGLE 2 ON" : "TOGGLE 2 OFF"}
        </button>
      </div>

      <div className="charts">
        <div className="chart-container">
          <Line data={{ labels, datasets: [{ label: "Temperature (°C)", data: temperatureData, borderColor: "red", backgroundColor: "rgba(255, 99, 132, 0.2)", fill: true }] }} options={chartOptions} />
        </div>
        <div className="chart-container">
          <Line data={{ labels, datasets: [{ label: "Humidity (%)", data: humidityData, borderColor: "blue", backgroundColor: "rgba(54, 162, 235, 0.2)", fill: true }] }} options={chartOptions} />
        </div>
        <div className="chart-container">
          <Line data={{ labels, datasets: [{ label: "Battery Level (%)", data: batteryData, borderColor: "green", backgroundColor: "rgba(75, 192, 75, 0.2)", fill: true }] }} options={chartOptions} />
        </div>
        <div className="chart-container">
          <Line data={{ labels, datasets: [{ label: "Signal Quality (%)", data: signalQualityData, borderColor: "purple", backgroundColor: "rgba(128, 0, 128, 0.2)", fill: true }] }} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
