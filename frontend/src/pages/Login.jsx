import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import logo from "../img/vaes-logo.png";
import "./Login.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      onLogin(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // const quickLogin = (role) => {
  //   if (role === "admin") {
  //     setUsername("admin");
  //     setPassword("admin123");
  //   } else if (role === "registrar") {
  //     setUsername("registrar");
  //     setPassword("reg123");
  //   } else {
  //     setUsername("teacher");
  //     setPassword("teacher123");
  //   }
  // };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img
            src={logo}
            alt="Villa Antonio Elementary School logo"
            className="login-logo"
          />
          <h1>Villa Antonio</h1>
          <p>Elementary School</p>
          <p className="deped-text">Department of Education</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* <div className="demo-logins">
          <p>Quick Login:</p>
          <button onClick={() => quickLogin('admin')} className="demo-btn">Admin</button>
          <button onClick={() => quickLogin('registrar')} className="demo-btn">Registrar</button>
          <button onClick={() => quickLogin('teacher')} className="demo-btn">Teacher</button>
        </div> */}
      </div>
    </div>
  );
}

export default Login;
