import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import "./styles/globals.css";
import { router } from "./router";
import { TaskProvider } from "./context/TaskContext";
import { ProjectProvider } from "./context/ProjectContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ProjectProvider>
        <TaskProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </TaskProvider>
      </ProjectProvider>
    </AuthProvider>
  </StrictMode>,
);