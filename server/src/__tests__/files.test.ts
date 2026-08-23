import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface ProjectFileResponse {
  id: string;
  name: string;
  extension: string;
  kind: string;
  sizeBytes: number;
  folder: string;
  uploaderId: string | null;
  projectId: string;
}

describe("files", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  async function registerAndLogin(label: string): Promise<RegisteredUser> {
    const email = uniqueEmail(label);
    const registered = await fetchJson<{ id: string }>(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: label, email, password: "TestPass123!" }),
    });
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "TestPass123!" }),
    });
    return { id: registered.body.id, email, token: login.body.token };
  }

  /** Creates a workspace/project owned by a fresh user (auto project Owner), returning every id plus the owner. */
  async function createProjectFixture(
    ownerLabel: string,
    workspaceName: string,
    projectName: string,
  ): Promise<{ owner: RegisteredUser; workspaceId: string; projectId: string }> {
    const owner = await registerAndLogin(ownerLabel);

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: workspaceName }),
    });
    const workspaceId = workspace.body.id;

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: projectName }),
    });

    return { owner, workspaceId, projectId: project.body.id };
  }

  test("create persists name/extension/kind/sizeBytes/folder/uploaderId for real; list returns it after a fresh fetch", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "file-create-owner",
      "File Create Workspace",
      "File Create Project",
    );

    const created = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({
          name: "Roadmap",
          extension: "pdf",
          kind: "pdf",
          sizeBytes: 2048,
          folder: "Docs",
        }),
      },
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.name, "Roadmap");
    assert.equal(created.body.extension, "pdf");
    assert.equal(created.body.kind, "pdf");
    assert.equal(created.body.sizeBytes, 2048);
    assert.equal(created.body.folder, "Docs");
    assert.equal(created.body.uploaderId, owner.id);

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<ProjectFileResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(
      listed.body.some(
        (file) =>
          file.id === created.body.id &&
          file.name === "Roadmap" &&
          file.extension === "pdf" &&
          file.kind === "pdf" &&
          file.sizeBytes === 2048 &&
          file.folder === "Docs",
      ),
    );
  });

  test("create validation rejects missing name/extension, an invalid kind, an invalid sizeBytes, and a non-string folder; an omitted/blank folder defaults to General", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "file-validation-owner",
      "File Validation Workspace",
      "File Validation Project",
    );

    const missingName = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { method: "POST", token: owner.token, body: JSON.stringify({ extension: "png", kind: "image", sizeBytes: 10 }) },
    );
    assert.equal(missingName.status, 400);

    const missingExtension = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { method: "POST", token: owner.token, body: JSON.stringify({ name: "Logo", kind: "image", sizeBytes: 10 }) },
    );
    assert.equal(missingExtension.status, 400);

    const invalidKind = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Logo", extension: "png", kind: "not-a-real-kind", sizeBytes: 10 }),
      },
    );
    assert.equal(invalidKind.status, 400);

    const invalidSize = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Logo", extension: "png", kind: "image", sizeBytes: -5 }),
      },
    );
    assert.equal(invalidSize.status, 400);

    const invalidFolder = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Logo", extension: "png", kind: "image", sizeBytes: 10, folder: 123 }),
      },
    );
    assert.equal(invalidFolder.status, 400);

    const omittedFolder = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Logo", extension: "png", kind: "image", sizeBytes: 10 }),
      },
    );
    assert.equal(omittedFolder.status, 201);
    assert.equal(omittedFolder.body.folder, "General");

    const blankFolder = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Logo", extension: "png", kind: "image", sizeBytes: 10, folder: "   " }),
      },
    );
    assert.equal(blankFolder.status, 201);
    assert.equal(blankFolder.body.folder, "General");
  });

  test("delete removes the file for real — it no longer appears in a fresh list; deleting again 404s", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "file-delete-owner",
      "File Delete Workspace",
      "File Delete Project",
    );

    const created = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Temp", extension: "txt", kind: "document", sizeBytes: 1 }),
      },
    );
    const fileId = created.body.id;

    const deleted = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files/${fileId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(deleted.status, 204);

    const listed = await fetchJson<ProjectFileResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { token: owner.token },
    );
    assert.equal(listed.body.some((file) => file.id === fileId), false);

    const deleteAgain = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files/${fileId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(deleteAgain.status, 404);
  });

  test("authorization: any workspace member can list, but only a project Owner/Editor can create/delete — a project Viewer and a non-project workspace MEMBER are both forbidden", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "file-authz-owner",
      "File Authz Workspace",
      "File Authz Project",
    );
    const viewer = await registerAndLogin("file-authz-viewer");
    const workspaceOnlyMember = await registerAndLogin("file-authz-workspace-only-member");

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: viewer.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: workspaceOnlyMember.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ userId: viewer.id, role: "Viewer" }),
    });

    const created = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Owner-created file", extension: "txt", kind: "document", sizeBytes: 1 }),
      },
    );
    const fileId = created.body.id;

    // Any workspace member can read the list — even one who isn't even a
    // project member (workspaceOnlyMember).
    const viewerList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { token: viewer.token },
    );
    assert.equal(viewerList.status, 200);

    const workspaceOnlyList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      { token: workspaceOnlyMember.token },
    );
    assert.equal(workspaceOnlyList.status, 200);

    // A project Viewer (a real project member, but not Owner/Editor) cannot write.
    const viewerCreate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: viewer.token,
        body: JSON.stringify({ name: "Should not be created", extension: "txt", kind: "document", sizeBytes: 1 }),
      },
    );
    assert.equal(viewerCreate.status, 403);

    const viewerDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files/${fileId}`,
      { method: "DELETE", token: viewer.token },
    );
    assert.equal(viewerDelete.status, 403);

    // A workspace member who isn't even a project member is also forbidden
    // (requireProjectMembership rejects them before requireProjectRole runs).
    const workspaceOnlyCreate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/files`,
      {
        method: "POST",
        token: workspaceOnlyMember.token,
        body: JSON.stringify({ name: "Should not be created", extension: "txt", kind: "document", sizeBytes: 1 }),
      },
    );
    assert.equal(workspaceOnlyCreate.status, 403);
  });

  test("workspace isolation — a legitimate member of a different workspace/project gets 404, a total outsider gets 403", async () => {
    const { owner: ownerA, workspaceId: workspaceIdA, projectId: projectIdA } = await createProjectFixture(
      "file-isolation-owner-a",
      "File Isolation Workspace A",
      "File Isolation Project A",
    );

    const created = await fetchJson<ProjectFileResponse>(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/files`,
      {
        method: "POST",
        token: ownerA.token,
        body: JSON.stringify({
          name: "Workspace A's private file",
          extension: "txt",
          kind: "document",
          sizeBytes: 1,
        }),
      },
    );
    const fileId = created.body.id;

    const { owner: ownerB, workspaceId: workspaceIdB, projectId: projectIdB } = await createProjectFixture(
      "file-isolation-owner-b",
      "File Isolation Workspace B",
      "File Isolation Project B",
    );

    const crossDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdB}/files/${fileId}`,
      { method: "DELETE", token: ownerB.token },
    );
    assert.equal(crossDelete.status, 404);

    const outsider = await registerAndLogin("file-isolation-outsider");
    const outsiderList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/files`,
      { token: outsider.token },
    );
    assert.equal(outsiderList.status, 403);
  });
});
