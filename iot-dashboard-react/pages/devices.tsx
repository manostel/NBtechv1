import React, { useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { User, Device } from "../src/types";

// Dynamically import DevicesPage with SSR disabled to avoid Leaflet SSR issues
const DevicesPage = dynamic(
  () => import("../src/components/devices/DevicesPage"),
  { ssr: false }
);

interface DevicesPageProps {
  user: User | null;
  selectedDevice: Device | null;
  setSelectedDevice: (device: Device | null) => void;
  handleLogout: () => void;
}

const Devices: React.FC<DevicesPageProps> = ({ 
  user, 
  selectedDevice, 
  setSelectedDevice, 
  handleLogout 
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Will redirect
  }

  return (
    <DevicesPage 
      user={user} 
      onSelectDevice={setSelectedDevice} 
      onLogout={handleLogout} 
    />
  );
};

export default Devices;

