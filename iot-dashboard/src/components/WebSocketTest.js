import React, { useEffect, useState } from 'react';

function WebSocketTest() {
  // Replace with your WebSocket API Gateway endpoint.
  const wsEndpoint = "wss://iyo593t2z3.execute-api.eu-central-1.amazonaws.com/production";
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Create a new WebSocket connection.
    const webSocket = new WebSocket(wsEndpoint);
    setWs(webSocket);

    // When connection opens, send a test message.
    webSocket.onopen = () => {
      console.log("WebSocket connected.");
      // Send an initial message; adjust payload as needed.
      const testMessage = {
        connectionId: "TEST_CONNECTION_ID", // For testing, this can be a placeholder.
        clientId: "prototypeDevice",
        action: "request-data"  // action can be 'request-data' or any other command your Lambda expects.
      };
      webSocket.send(JSON.stringify(testMessage));
      console.log("Sent test message:", testMessage);
    };

    // Listen for messages from the server.
    webSocket.onmessage = (event) => {
      console.log("Received message:", event.data);
      setMessages(prev => [...prev, event.data]);
    };

    // Handle any errors.
    webSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // When connection closes.
    webSocket.onclose = (event) => {
      console.log("WebSocket closed:", event);
    };

    // Clean up on component unmount.
    return () => {
      webSocket.close();
    };
  }, [wsEndpoint]);

  return (
    <div>
      <h2>WebSocket Test</h2>
      <div>
        {messages.length === 0 && <p>No messages yet...</p>}
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px', padding: '5px', border: '1px solid #ddd' }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WebSocketTest;
