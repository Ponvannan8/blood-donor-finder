import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/auth.css";
import "./styles/dashboard.css";
import "./styles/requests.css";
import "./styles/chat.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
