import React from "react";
import dynamic from "next/dynamic";

// Dynamically import BluetoothControl with SSR disabled to avoid localStorage issues
const BluetoothControl = dynamic(
  () => import("../src/components/common/BluetoothControl"),
  { ssr: false }
);

const Bluetooth: React.FC = () => {
  const handleClose = () => {
    // Navigate back or close modal
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return <BluetoothControl device={undefined} onClose={handleClose} />;
};

export default Bluetooth;

