import React, { useState, useEffect } from 'react';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonToggle,
  IonRange,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLoading,
  IonToast,
} from '@ionic/react';

// UUIDs from your ESP32 code
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED1_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const LED2_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
const SPEED_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
const STATUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ab";

const BluetoothControl: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [led1State, setLed1State] = useState(false);
  const [led2State, setLed2State] = useState(false);
  const [motorSpeed, setMotorSpeed] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    initializeBluetooth();
    return () => {
      if (selectedDevice) {
        BleClient.disconnect(selectedDevice.deviceId);
      }
    };
  }, []);

  const initializeBluetooth = async () => {
    try {
      await BleClient.initialize();
      setToastMessage('Bluetooth initialized');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to initialize Bluetooth');
      setShowToast(true);
    }
  };

  const startScan = async () => {
    try {
      setIsScanning(true);
      setDevices([]);
      
      await BleClient.requestLEScan(
        { services: [SERVICE_UUID] },
        (result) => {
          if (result.device.name?.startsWith('NBtechv1_')) {
            setDevices(prevDevices => {
              const existing = prevDevices.find(d => d.deviceId === result.device.deviceId);
              if (!existing) {
                return [...prevDevices, result.device];
              }
              return prevDevices;
            });
          }
        }
      );

      // Stop scanning after 5 seconds
      setTimeout(() => {
        BleClient.stopLEScan();
        setIsScanning(false);
      }, 5000);
    } catch (error) {
      setToastMessage('Failed to start scanning');
      setShowToast(true);
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: any) => {
    try {
      await BleClient.connect(device.deviceId);
      setSelectedDevice(device);
      setIsConnected(true);
      setToastMessage(`Connected to ${device.name}`);
      setShowToast(true);

      // Set up status notifications
      await BleClient.startNotifications(
        device.deviceId,
        SERVICE_UUID,
        STATUS_CHAR_UUID,
        (value) => {
          const statusStr = new TextDecoder().decode(value);
          const parts = statusStr.split(',');
          parts.forEach(part => {
            const [key, value] = part.split(':');
            switch (key) {
              case 'LED1':
                setLed1State(value === '1');
                break;
              case 'LED2':
                setLed2State(value === '1');
                break;
              case 'SPEED':
                setMotorSpeed(parseInt(value));
                break;
            }
          });
        }
      );
    } catch (error) {
      setToastMessage('Failed to connect to device');
      setShowToast(true);
    }
  };

  const toggleLED1 = async (value: boolean) => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED1_CHAR_UUID,
        new Uint8Array([value ? 1 : 0])
      );
      setLed1State(value);
    } catch (error) {
      setToastMessage('Failed to toggle LED1');
      setShowToast(true);
    }
  };

  const toggleLED2 = async (value: boolean) => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED2_CHAR_UUID,
        new Uint8Array([value ? 1 : 0])
      );
      setLed2State(value);
    } catch (error) {
      setToastMessage('Failed to toggle LED2');
      setShowToast(true);
    }
  };

  const setSpeed = async (value: number) => {
    if (!selectedDevice) return;
    try {
      const speedStr = value.toString();
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        SPEED_CHAR_UUID,
        new TextEncoder().encode(speedStr)
      );
      setMotorSpeed(value);
    } catch (error) {
      setToastMessage('Failed to set motor speed');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Bluetooth Control</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={isScanning} message="Scanning for devices..." />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />

        {!isConnected ? (
          <>
            <IonButton expand="block" onClick={startScan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Scan for Devices'}
            </IonButton>

            <IonList>
              {devices.map((device) => (
                <IonItem key={device.deviceId} button onClick={() => connectToDevice(device)}>
                  <IonLabel>
                    <h2>{device.name || 'Unknown Device'}</h2>
                    <p>{device.deviceId}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        ) : (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{selectedDevice?.name}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>LED 1</IonLabel>
                <IonToggle
                  checked={led1State}
                  onIonChange={e => toggleLED1(e.detail.checked)}
                />
              </IonItem>

              <IonItem>
                <IonLabel>LED 2</IonLabel>
                <IonToggle
                  checked={led2State}
                  onIonChange={e => toggleLED2(e.detail.checked)}
                />
              </IonItem>

              <IonItem>
                <IonLabel>Motor Speed: {motorSpeed}</IonLabel>
                <IonRange
                  min={0}
                  max={255}
                  step={1}
                  value={motorSpeed}
                  onIonChange={e => setSpeed(e.detail.value as number)}
                />
              </IonItem>

              <IonButton
                expand="block"
                color="danger"
                onClick={() => {
                  BleClient.disconnect(selectedDevice.deviceId);
                  setIsConnected(false);
                  setSelectedDevice(null);
                }}
              >
                Disconnect
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default BluetoothControl; 