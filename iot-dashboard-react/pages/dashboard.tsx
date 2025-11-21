import React, { useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { User, Device } from "../src/types";

// Dynamically import Dashboard with SSR disabled to avoid Chart.js/plugin-zoom SSR issues
const Dashboard = dynamic(
  () => import("../src/components/dashboard/Dashboard"),
  { ssr: false }
);

interface DashboardPageProps {
  user: User | null;
  selectedDevice: Device | null;
  handleLogout: () => void;
  setSelectedDevice: (device: Device | null) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ 
  user, 
  selectedDevice, 
  handleLogout,
  setSelectedDevice 
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!user || !selectedDevice) {
      router.push('/devices');
    }
  }, [user, selectedDevice, router]);

  if (!user || !selectedDevice) {
    return null; // Will redirect
  }

  return (
    <Dashboard 
      user={user} 
      device={selectedDevice} 
      onLogout={handleLogout} 
      onBack={() => setSelectedDevice(null)} 
    />
  );
};

export default DashboardPage;

