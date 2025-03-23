import { useState } from "react";
import { Helmet } from "react-helmet";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // For traditional login (email/password)
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would normally validate credentials
    onLogin({ email });
  };

  // Google login success callback
  const handleGoogleLoginSuccess = (credentialResponse) => {
    // credentialResponse contains a credential property with the token
    const token = credentialResponse.credential;
    // Decode the token using the imported jwtDecode function
    const decoded = jwtDecode(token);
    console.log("Google token decoded:", decoded);
    // Extract email (or other info) and log the user in.
    onLogin({ email: decoded.email });
  };

  const handleGoogleLoginError = () => {
    console.log("Google login failed");
  };

  return (
    <div className="login-container">
      <Helmet>
        <title>Login | IoT Dashboard</title>
        <meta name="description" content="Login to your IoT Dashboard" />
      </Helmet>
      <h1>IoT Dashboard Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Log In</button>
      </form>
      <div style={{ marginTop: "20px" }}>
        <GoogleLogin
          onSuccess={handleGoogleLoginSuccess}
          onError={handleGoogleLoginError}
        />
      </div>
    </div>
  );
}
