import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Login from "./Login";

/**
 * Phase 19 Frontend Integration follow-up — Add Automated Tests.
 * Covers the demo-login checklist item from the client side: the
 * "Explore Demo Workspace" button must sign in as the real, seeded
 * Demo Workspace owner (demo.owner@orbitdemo.local), not the old
 * RBAC-only owner@orbit.dev account (see AuthContext.tsx's
 * DEMO_ROLE_BY_EMAIL doc comment for why those are different accounts).
 * The actual network call is exercised for real by the backend's own
 * auth.test.ts; this just locks in that Login.tsx asks for the right
 * credentials.
 */
const login = vi.fn().mockResolvedValue(undefined);

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login }),
}));

describe("Login demo button", () => {
  test("signs in as the real seeded Demo Workspace owner", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /explore demo workspace/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("demo.owner@orbitdemo.local", "DemoPass123!"));
  });
});
