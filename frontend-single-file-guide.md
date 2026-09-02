# How to use the single App.jsx frontend

Your frontend can remain ONE main React component file: App.jsx.

You do not need to split the UI into dozens of files just because the backend is separate.

Recommended small React project:

src/
  App.jsx
  main.jsx

index.html
package.json
vite.config.js (optional)

## main.jsx

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## index.css

Because App.jsx uses Tailwind utility classes, your frontend build must have Tailwind available.

If your existing Claude project already has Tailwind configured, KEEP its existing configuration. Do not rebuild it.

## The important connection

Your App.jsx currently has:

const API_BASE = "https://shinex-marketplace.onrender.com/api";

That means:

Browser
  -> SHINEX React frontend
  -> https://shinex-marketplace.onrender.com/api
  -> Express backend
  -> Supabase database
  -> Cloudinary images

For login/register the backend returns a JWT. App.jsx stores it as `shinex_token` and sends it as:

Authorization: Bearer YOUR_TOKEN

## Deploying the frontend

If you already have the React frontend on Render, keep that frontend service.

Build command is normally:

npm install && npm run build

Publish directory:

dist

Do NOT deploy App.jsx as a plain HTML file. It is React code and needs a React build.

## If using AppDeploy

Give AppDeploy the existing React project and tell it:

- Keep App.jsx as the main single-file frontend.
- Do not create a second application.
- Do not replace the backend URL.
- Build the existing React project.
- Keep Tailwind and lucide-react.
- Use https://shinex-marketplace.onrender.com/api as the API.
- Do not put secret keys in the frontend.

Then the frontend and backend remain two services but one SHINEX marketplace.
