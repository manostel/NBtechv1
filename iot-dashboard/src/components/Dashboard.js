import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
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
import "chartjs-adapter-date-fns"; // ✅ Required for time-based charts
import "./Dashboard.css"; // ✅ Import CSS file for styling

// ✅ Register required Chart.js components
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
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data from API...");
        const response = await axios.get("http://127.0.0.1:5000/last-100");
        console.log("Fetched data:", response.data);

        const data = response.data;

        if (!Array.isArray(data)) {
          console.error("Invalid API response:", data);
          return;
        }

        const tempData = [];
        const humData = [];
        const timeLabels = [];

        data.forEach((msg) => {
          if (msg.timestamp && msg.temperature !== undefined && msg.humidity !== undefined) {
            timeLabels.push(new Date(msg.timestamp));
            tempData.push(parseFloat(msg.temperature));
            humData.push(parseFloat(msg.humidity));
          }
        });

        setLabels(timeLabels);
        setTemperatureData(tempData);
        setHumidityData(humData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
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
        time: {
          unit: "minute",
          tooltipFormat: "yyyy-MM-dd HH:mm:ss",
        },
        title: {
          display: true,
          text: "Time",
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="dashboard">
      <h1>IoT Dashboard</h1>
      <div className="charts">
        <div className="chart-container"> {/* ✅ Set fixed size */}
          <Line
            key={labels.join()}
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
        <div className="chart-container"> {/* ✅ Set fixed size */}
          <Line
            key={labels.join()}
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
      </div>
    </div>
  );
}

export default Dashboard;
