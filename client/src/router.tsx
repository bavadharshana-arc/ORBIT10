import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RequireRole from "./components/auth/RequireRole";
import DashboardLayout from "./components/layout/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Tasks from "./pages/Tasks";
import Kanban from "./pages/Kanban";
import Calendar from "./pages/Calendar";
import Timeline from "./pages/Timeline";
import Team from "./pages/Team";
import Analytics from "./pages/Analytics";
import Files from "./pages/Files";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import { ProjectOverviewTab } from "./components/projects/ProjectOverviewTab";
import { ProjectBoardTab } from "./components/projects/ProjectBoardTab";
import { ProjectListTab } from "./components/projects/ProjectListTab";
import { ProjectTimelineTab } from "./components/projects/ProjectTimelineTab";
import { ProjectCalendarTab } from "./components/projects/ProjectCalendarTab";
import { ProjectFilesTab } from "./components/projects/ProjectFilesTab";
import { ProjectDiscussionsTab } from "./components/projects/ProjectDiscussionsTab";
import { ProjectActivityTab } from "./components/projects/ProjectActivityTab";
import { ProjectTeamTab } from "./components/projects/ProjectTeamTab";
import { ProjectAnalyticsTab } from "./components/projects/ProjectAnalyticsTab";
import { ProjectSettingsTab } from "./components/projects/ProjectSettingsTab";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/projects", element: <Projects /> },
          {
            path: "/projects/:projectId",
            element: <ProjectWorkspace />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <ProjectOverviewTab /> },
              { path: "board", element: <ProjectBoardTab /> },
              { path: "list", element: <ProjectListTab /> },
              { path: "timeline", element: <ProjectTimelineTab /> },
              { path: "calendar", element: <ProjectCalendarTab /> },
              { path: "files", element: <ProjectFilesTab /> },
              { path: "discussions", element: <ProjectDiscussionsTab /> },
              { path: "activity", element: <ProjectActivityTab /> },
              { path: "team", element: <ProjectTeamTab /> },
              { path: "analytics", element: <ProjectAnalyticsTab /> },
              { path: "settings", element: <ProjectSettingsTab /> },
            ],
          },
          { path: "/tasks", element: <Tasks /> },
          { path: "/kanban", element: <Kanban /> },
          { path: "/calendar", element: <Calendar /> },
          { path: "/timeline", element: <Timeline /> },
          { path: "/team", element: <Team /> },
          { path: "/analytics", element: <Analytics /> },
          { path: "/files", element: <Files /> },
          {
            // Proof-of-concept for route-level RBAC (Chunk 5) — Settings
            // holds the app's most privileged controls (Workspace,
            // Danger Zone), so it's gated at Admin and above here. Every
            // other route above is still only auth-gated by the
            // ProtectedRoute this sits inside, unchanged.
            element: <RequireRole />,
            children: [{ path: "/settings", element: <Settings /> }],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
]);
