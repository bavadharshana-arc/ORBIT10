import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Search,
  Send,
  Paperclip,
  Pin,
  PinOff,
  MessageSquare,
  HelpCircle,
  Megaphone,
  MessagesSquare,
  X,
  Check,
  Reply as ReplyIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Discussion, DiscussionReply, DiscussionType } from "../../types/workspace";
import type { WorkspaceActor } from "../../types/workspace";
import { loadMembers, getInitials } from "../../data/teamData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/workspaceContextValue";
import {
  resolveCurrentActor,
  formatRelativeTime,
  formatFileSize,
  REACTION_EMOJIS,
  DISCUSSION_TYPE_LABEL,
  canEditProjectContent,
  canCommentOnProject,
} from "../../data/workspaceData";
import { ApiError } from "../../lib/api";
import { createActivityEvent } from "../../lib/activityApi";
import {
  listDiscussions as listDiscussionsRequest,
  createDiscussion as createDiscussionRequest,
  setPinned as setPinnedRequest,
  addReply as addReplyRequest,
  addReaction as addReactionRequest,
  removeReaction as removeReactionRequest,
  addAttachment as addAttachmentRequest,
  type DiscussionRecord,
  type DiscussionReplyRecord,
} from "../../lib/discussionApi";
import { listFiles as listFilesRequest, type ProjectFileApiRecord } from "../../lib/fileApi";
import { listWorkspaceMembers, type WorkspaceMemberRecord } from "../../lib/workspaceApi";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";

const TYPE_ICON: Record<DiscussionType, LucideIcon> = {
  update: MessageSquare,
  question: HelpCircle,
  announcement: Megaphone,
};

/* ============================================================
   MENTION-AWARE BODY RENDERER
============================================================ */

function renderBody(text: string, actorNames: string[]) {
  if (actorNames.length === 0) return text;

  const escaped = actorNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${escaped.join("|")})`, "g");
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    actorNames.includes(part) ? (
      <span key={index} style={{ color: "var(--blue-dark)", fontWeight: 650 }}>@{part}</span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

/* ============================================================
   COMPOSER

   Phase 33: the "Attach" button is wired for real. The backend only
   supports linking an *already-uploaded* real ProjectFile to a
   discussion (POST .../discussions/:id/attachments, Phase 16 Option
   B) — there's no raw upload/storage to invent (Phase 15's approved
   scope) — so "Attach" is a picker over the project's real Files tab
   contents (fileApi.ts's listFiles) rather than a native file input.
   The files chosen here are only *staged* locally (fileId/name/
   sizeBytes, same Discussion["attachments"] shape as the read path);
   the real POST .../attachments calls happen in
   ProjectDiscussionsTab's handleSubmit, one per staged file, right
   after the discussion itself is created — attaching needs a real
   discussionId, which doesn't exist until that POST returns.
============================================================ */

interface ComposerProps {
  actors: { id: string; name: string; initials: string; bg: string; fg?: string }[];
  currentActor: { id: string; name: string; initials: string; bg: string; fg?: string };
  workspaceId: string;
  projectId: string;
  /** Editor+ only — Commenters can post/mention but not attach files (matches the Files tab's upload gate). */
  canAttach: boolean;
  /**
   * Phase 29: the real id/author/createdAt/reactions/replies can only
   * come from the backend response after posting, so the composer hands
   * up the raw form values rather than building a full Discussion
   * itself — ProjectDiscussionsTab's handleSubmit does the real POST and
   * assembles the final Discussion from the response.
   */
  onSubmit: (values: {
    type: DiscussionType;
    body: string;
    mentions: string[];
    attachments: Discussion["attachments"];
  }) => void;
}

function Composer({ actors, currentActor, workspaceId, projectId, canAttach, onSubmit }: ComposerProps) {
  const [type, setType] = useState<DiscussionType>("update");
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Discussion["attachments"]>([]);
  const [showMentions, setShowMentions] = useState(false);

  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFileApiRecord[] | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const mentionQuery = (() => {
    const match = body.match(/@([a-zA-Z]*)$/);
    return match ? match[1].toLowerCase() : null;
  })();

  const mentionCandidates = mentionQuery !== null ? actors.filter((actor) => actor.name.toLowerCase().includes(mentionQuery)) : [];

  function insertMention(name: string, id: string) {
    setBody((current) => current.replace(/@([a-zA-Z]*)$/, `@${name} `));
    setMentions((current) => (current.includes(id) ? current : [...current, id]));
    setShowMentions(false);
  }

  // Loads the project's real files the first time "Attach" opens —
  // not eagerly on every Composer mount, since most posts never touch
  // this button. Every setState below runs inside the promise chain,
  // not synchronously in the effect body — same reasoning as every
  // other Phase 24–29 fetch effect in this codebase.
  useEffect(() => {
    if (!isAttachOpen || projectFiles !== null) return;

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setFilesLoading(true);
        setFilesError(null);
        return listFilesRequest(workspaceId, projectId);
      })
      .then((records) => {
        if (cancelled || !records) return;
        setProjectFiles(records);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFilesError(err instanceof ApiError ? err.message : "Couldn't load files.");
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAttachOpen, projectFiles, workspaceId, projectId]);

  function toggleAttachment(file: ProjectFileApiRecord) {
    setAttachments((current) => {
      if (current.some((attachment) => attachment.fileId === file.id)) {
        return current.filter((attachment) => attachment.fileId !== file.id);
      }
      return [...current, { fileId: file.id, name: `${file.name}.${file.extension}`, sizeBytes: file.sizeBytes }];
    });
  }

  function removeStagedAttachment(fileId: string) {
    setAttachments((current) => current.filter((attachment) => attachment.fileId !== fileId));
  }

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    onSubmit({ type, body: trimmed, mentions, attachments });
    setBody("");
    setMentions([]);
    setAttachments([]);
    setType("update");
  }

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 18 }}>
      <div className="flex items-start" style={{ gap: 12 }}>
        <Avatar initials={currentActor.initials} bg={currentActor.bg} fg={currentActor.fg} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
            {(["update", "question", "announcement"] as DiscussionType[]).map((option) => {
              const isActive = type === option;
              const Icon = TYPE_ICON[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className="flex items-center"
                  style={{
                    gap: 5,
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: isActive ? "var(--text)" : "var(--surface-2)",
                    color: isActive ? "var(--surface)" : "var(--text-2)",
                  }}
                >
                  <Icon size={11} strokeWidth={2} />
                  {DISCUSSION_TYPE_LABEL[option]}
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative" }}>
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setShowMentions(/@([a-zA-Z]*)$/.test(event.target.value));
              }}
              placeholder="Share an update, ask a question, or post an announcement… type @ to mention someone"
              rows={3}
              style={{ width: "100%", resize: "none", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "var(--text)", background: "var(--surface-2)", outline: "none", fontFamily: "inherit" }}
            />
            {showMentions && mentionCandidates.length > 0 && (
              <div className="bg-card border-soft shadow-float-lg fade-in-static" style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 220, borderRadius: 12, padding: 6, zIndex: 20 }}>
                {mentionCandidates.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => insertMention(actor.name, actor.id)}
                    className="nav-item flex items-center"
                    style={{ width: "100%", gap: 8, border: "none", background: "transparent", borderRadius: 8, padding: "6px 8px", cursor: "pointer", textAlign: "left" }}
                  >
                    <Avatar initials={actor.initials} bg={actor.bg} fg={actor.fg} size={22} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{actor.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 8 }}>
              {attachments.map((attachment) => (
                <span key={attachment.fileId} className="flex items-center" style={{ gap: 5, background: "var(--surface-2)", borderRadius: 999, padding: "4px 10px", fontSize: 11, color: "var(--text-2)" }}>
                  <Paperclip size={10} />
                  {attachment.name}
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => removeStagedAttachment(attachment.fileId)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: "var(--text-3)" }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            {canAttach ? (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsAttachOpen((current) => !current)}
                  className="flex items-center"
                  style={{ gap: 6, border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, padding: "7px 12px", fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", cursor: "pointer" }}
                >
                  <Paperclip size={12} /> Attach
                </button>

                {isAttachOpen && (
                  <>
                    <div onClick={() => setIsAttachOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div
                      className="bg-card border-soft shadow-float-lg fade-in-static"
                      style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: 260, borderRadius: 14, padding: 10, zIndex: 41 }}
                    >
                      <div style={{ padding: "2px 4px 8px", fontSize: 10.5, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Attach an existing file
                      </div>

                      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                        {filesLoading ? (
                          <p className="text-ink-3" style={{ fontSize: 11.5, padding: "10px 8px", textAlign: "center" }}>Loading files…</p>
                        ) : filesError ? (
                          <p style={{ fontSize: 11.5, padding: "10px 8px", textAlign: "center", color: "#B3564B" }}>{filesError}</p>
                        ) : !projectFiles || projectFiles.length === 0 ? (
                          <p className="text-ink-3" style={{ fontSize: 11.5, padding: "10px 8px", textAlign: "center" }}>
                            No files yet — upload one in the Files tab first.
                          </p>
                        ) : (
                          projectFiles.map((file) => {
                            const selected = attachments.some((attachment) => attachment.fileId === file.id);
                            return (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => toggleAttachment(file)}
                                className="nav-item flex items-center"
                                style={{ width: "100%", gap: 8, border: "none", background: "transparent", borderRadius: 8, padding: "7px 8px", cursor: "pointer", textAlign: "left" }}
                              >
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {file.name}.{file.extension}
                                  </span>
                                  <span className="text-ink-3" style={{ fontSize: 10.5 }}>{formatFileSize(file.sizeBytes)}</span>
                                </span>
                                {selected && <Check size={13} color="var(--blue-dark)" style={{ flexShrink: 0 }} />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!body.trim()}
              className="lift flex items-center"
              style={{ gap: 7, border: "none", background: body.trim() ? "var(--text)" : "var(--border)", color: "var(--surface)", borderRadius: 11, padding: "9px 16px", fontSize: 12.5, fontWeight: 650, cursor: body.trim() ? "pointer" : "not-allowed" }}
            >
              <Send size={13} /> Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DISCUSSION CARD
============================================================ */

interface DiscussionCardProps {
  discussion: Discussion;
  actorNames: string[];
  currentActor: { id: string; name: string; initials: string; bg: string; fg?: string };
  /** Commenter+ — reacting and replying. */
  canComment: boolean;
  /** Editor+ — pinning is a light organizational action, not casual commenting. */
  canPin: boolean;
  onTogglePin: () => void;
  onToggleReaction: (emoji: string) => void;
  onReply: (text: string) => void;
}

function DiscussionCard({ discussion, actorNames, currentActor, canComment, canPin, onTogglePin, onToggleReaction, onReply }: DiscussionCardProps) {
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const Icon = TYPE_ICON[discussion.type];

  function submitReply() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setReplyText("");
  }

  return (
    <div
      className="bg-card shadow-float fade-in"
      style={{ borderRadius: 18, padding: 18, border: discussion.pinned ? "1px solid var(--blue-dark)" : "1px solid var(--border)" }}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <Avatar initials={discussion.author.initials} bg={discussion.author.bg} fg={discussion.author.fg} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>{discussion.author.name}</span>
            <Pill tone={discussion.type === "announcement" ? "dark" : discussion.type === "question" ? "blue" : "surface"}>
              <span className="flex items-center" style={{ gap: 4 }}>
                <Icon size={10} /> {DISCUSSION_TYPE_LABEL[discussion.type]}
              </span>
            </Pill>
            {discussion.pinned && <Pill tone="blue">Pinned</Pill>}
            <span className="text-ink-3" style={{ fontSize: 11 }}>{formatRelativeTime(discussion.createdAt)}</span>
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
            {renderBody(discussion.body, actorNames)}
          </p>

          {discussion.attachments.length > 0 && (
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 10 }}>
              {discussion.attachments.map((attachment) => (
                <span key={attachment.fileId} className="flex items-center text-ink-2" style={{ gap: 5, background: "var(--surface-2)", borderRadius: 999, padding: "4px 10px", fontSize: 11 }}>
                  <Paperclip size={10} /> {attachment.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 12 }}>
            {REACTION_EMOJIS.map((emoji) => {
              const reactors = discussion.reactions[emoji] ?? [];
              const reactedByMe = reactors.includes(currentActor.id);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  disabled={!canComment}
                  style={{
                    border: reactedByMe ? "1px solid var(--blue-dark)" : "1px solid var(--border)",
                    background: reactedByMe ? "var(--surface-2)" : "transparent",
                    borderRadius: 999,
                    padding: "3px 9px",
                    fontSize: 12,
                    cursor: canComment ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>{emoji}</span>
                  {reactors.length > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-2)" }}>{reactors.length}</span>}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowReplies((current) => !current)}
              className="flex items-center text-ink-2"
              style={{ gap: 5, border: "none", background: "transparent", fontSize: 11.5, fontWeight: 600, cursor: "pointer", marginLeft: 4 }}
            >
              <ReplyIcon size={12} />
              {discussion.replies.length > 0 ? `${discussion.replies.length} repl${discussion.replies.length === 1 ? "y" : "ies"}` : "Reply"}
            </button>

            {canPin && (
              <button
                type="button"
                onClick={onTogglePin}
                aria-label={discussion.pinned ? "Unpin" : "Pin"}
                className="text-ink-3"
                style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
              >
                {discussion.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            )}
          </div>

          {showReplies && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div className="flex flex-col" style={{ gap: 10, marginBottom: 10 }}>
                {discussion.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start" style={{ gap: 9 }}>
                    <Avatar initials={reply.author.initials} bg={reply.author.bg} fg={reply.author.fg} size={26} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex items-center" style={{ gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 650, color: "var(--text)" }}>{reply.author.name}</span>
                        <span className="text-ink-3" style={{ fontSize: 10.5 }}>{formatRelativeTime(reply.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "2px 0 0", lineHeight: 1.5 }}>{reply.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {canComment && (
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Avatar initials={currentActor.initials} bg={currentActor.bg} fg={currentActor.fg} size={26} />
                  <input
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => event.key === "Enter" && submitReply()}
                    placeholder="Write a reply…"
                    style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, padding: "7px 11px", fontSize: 12, color: "var(--text)", background: "var(--surface-2)", outline: "none" }}
                  />
                  <button type="button" onClick={submitReply} aria-label="Send reply" style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "var(--text)", color: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <Send size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAPPERS (Phase 29)

   Real Discussion/Reply/Reaction records carry only authorId/userId —
   resolved into WorkspaceActors via the real workspace members list,
   same pattern as Comments (Phase 27) and Files (Phase 28). Reactions
   arrive as a flat list (one row per user+emoji); the UI expects
   emoji -> member ids, so they're folded here. Attachments render real
   linked files when present — mapDiscussion() here handles the read
   path (GET), the same shape handleSubmit() builds by hand for the
   create path's response (Phase 33), since a freshly-posted discussion
   doesn't get re-fetched just to pick up its own attachments.
============================================================ */

const NEUTRAL_AVATAR = { bg: "var(--surface-2)", fg: "var(--text)" };

function resolveActor(
  id: string,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: WorkspaceActor,
): WorkspaceActor {
  const member = membersById.get(id);
  if (!member) return fallback;
  const name = member.user.name ?? member.user.email;
  return {
    id,
    name,
    initials: getInitials(name),
    bg: member.user.avatarBg ?? NEUTRAL_AVATAR.bg,
    fg: member.user.avatarFg ?? NEUTRAL_AVATAR.fg,
  };
}

function mapReply(
  record: DiscussionReplyRecord,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: WorkspaceActor,
): DiscussionReply {
  return {
    id: record.id,
    author: resolveActor(record.authorId, membersById, fallback),
    text: record.text,
    createdAt: new Date(record.createdAt).getTime(),
  };
}

function mapDiscussion(
  record: DiscussionRecord,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: WorkspaceActor,
): Discussion {
  const reactions: Record<string, string[]> = {};
  for (const reaction of record.reactions) {
    reactions[reaction.emoji] = [...(reactions[reaction.emoji] ?? []), reaction.userId];
  }

  return {
    id: record.id,
    projectId: record.projectId,
    type: record.type,
    body: record.body,
    author: resolveActor(record.authorId, membersById, fallback),
    createdAt: new Date(record.createdAt).getTime(),
    pinned: record.pinned,
    mentions: record.mentions,
    attachments: record.attachments.map((attachment) => ({
      fileId: attachment.file.id,
      name: `${attachment.file.name}.${attachment.file.extension}`,
      sizeBytes: attachment.file.sizeBytes,
    })),
    reactions,
    replies: record.replies.map((reply) => mapReply(reply, membersById, fallback)),
  };
}

/* ============================================================
   DISCUSSIONS TAB
============================================================ */

type TypeFilter = "all" | DiscussionType;

export function ProjectDiscussionsTab() {
  const { project, permission, projectMembers } = useProjectWorkspace();
  const canEdit = canEditProjectContent(permission);
  const canComment = canCommentOnProject(permission);
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  // Real project roster (Phase 19 Frontend Integration follow-up:
  // Persist Project people) — replaces the old getProjectActors, which
  // fuzzy-matched a local-only Project.people field against the mock
  // `members` list above (`members`/resolveCurrentActor below are
  // unrelated: that's "who am I", not "who's on this project").
  const actors = useMemo<WorkspaceActor[]>(
    () =>
      projectMembers.map((record) => {
        const name = record.user.name ?? record.user.email;
        return {
          id: record.userId,
          name,
          initials: getInitials(name),
          bg: record.user.avatarBg ?? "var(--blue)",
          fg: record.user.avatarFg ?? "var(--text)",
        };
      }),
    [projectMembers],
  );
  const actorNames = useMemo(() => actors.map((a) => a.name), [actors]);
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);

  const { currentWorkspaceId } = useWorkspace();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [discussionsError, setDiscussionsError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    if (!currentWorkspaceId) {
      return;
    }

    let cancelled = false;
    const workspaceId = currentWorkspaceId;
    const projectId = project.id;

    // Deferred into the promise chain — never synchronous in the effect
    // body — same reasoning as every other Phase 24–28 fetch effect.
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setDiscussionsLoading(true);
        setDiscussionsError(null);
        return Promise.all([listWorkspaceMembers(workspaceId), listDiscussionsRequest(workspaceId, projectId)]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [workspaceMembers, records] = result;
        const membersById = new Map(workspaceMembers.map((member) => [member.userId, member] as const));
        setDiscussions(records.map((record) => mapDiscussion(record, membersById, currentActor)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDiscussions([]);
        setDiscussionsError(err instanceof ApiError ? err.message : "Couldn't load discussions. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setDiscussionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // currentActor intentionally omitted — it's only a display fallback,
    // not a refetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId, project.id]);

  async function handleSubmit(values: { type: DiscussionType; body: string; mentions: string[]; attachments: Discussion["attachments"] }) {
    if (!canComment || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      const record = await createDiscussionRequest(currentWorkspaceId, project.id, {
        type: values.type,
        body: values.body,
        mentions: values.mentions,
      });

      // Phase 33: attach() needs a real discussionId, which only exists
      // once the create above returns — so the files staged in the
      // Composer are attached here, one real POST per file, rather than
      // bundled into the create body. Settled (not awaited as a single
      // Promise.all) so one failed attachment can't take the rest down
      // with it — the discussion itself already exists either way.
      const settled = await Promise.allSettled(
        values.attachments.map((attachment) =>
          addAttachmentRequest(currentWorkspaceId, project.id, record.id, attachment.fileId),
        ),
      );

      const attachedRecords = settled
        .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof addAttachmentRequest>>> => result.status === "fulfilled")
        .map((result) => result.value);
      const failedCount = settled.length - attachedRecords.length;

      const discussion: Discussion = {
        id: record.id,
        projectId: record.projectId,
        type: record.type,
        body: record.body,
        author: currentActor,
        createdAt: new Date(record.createdAt).getTime(),
        pinned: record.pinned,
        mentions: record.mentions,
        attachments: attachedRecords.map((attachment) => ({
          fileId: attachment.file.id,
          name: `${attachment.file.name}.${attachment.file.extension}`,
          sizeBytes: attachment.file.sizeBytes,
        })),
        reactions: {},
        replies: [],
      };

      setDiscussions((current) => [discussion, ...current]);

      if (currentWorkspaceId) {
        // Best-effort, real activity log entry — failure here shouldn't
        // undo or block the post that already succeeded above.
        createActivityEvent(currentWorkspaceId, project.id, {
          type: "discussion_posted",
          text: `${currentActor.name} posted ${discussion.type === "announcement" ? "an" : "a"} ${DISCUSSION_TYPE_LABEL[discussion.type].toLowerCase()}`,
          actorId: user?.id,
        }).catch((err: unknown) => console.error("Couldn't log discussion-posted activity:", err));
      }

      if (failedCount > 0) {
        setMutationError(
          failedCount === 1
            ? "Posted, but one attachment couldn't be linked. Try attaching it again from a new post."
            : `Posted, but ${failedCount} attachments couldn't be linked. Try attaching them again from a new post.`,
        );
      }
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't post. Try again.");
    }
  }

  async function togglePin(id: string) {
    if (!canEdit || !currentWorkspaceId) return;
    const target = discussions.find((d) => d.id === id);
    if (!target) return;

    setMutationError(null);

    try {
      const record = await setPinnedRequest(currentWorkspaceId, project.id, id, !target.pinned);
      setDiscussions((current) => current.map((d) => (d.id === id ? { ...d, pinned: record.pinned } : d)));
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't update the pin. Try again.");
    }
  }

  async function toggleReaction(id: string, emoji: string) {
    if (!canComment || !currentWorkspaceId) return;
    const target = discussions.find((d) => d.id === id);
    if (!target) return;

    const alreadyReacted = (target.reactions[emoji] ?? []).includes(currentActor.id);

    setMutationError(null);

    try {
      if (alreadyReacted) {
        await removeReactionRequest(currentWorkspaceId, project.id, id, emoji);
      } else {
        await addReactionRequest(currentWorkspaceId, project.id, id, emoji);
      }

      setDiscussions((current) =>
        current.map((d) => {
          if (d.id !== id) return d;
          const reactors = d.reactions[emoji] ?? [];
          const nextReactors = alreadyReacted
            ? reactors.filter((r) => r !== currentActor.id)
            : [...reactors, currentActor.id];
          return { ...d, reactions: { ...d.reactions, [emoji]: nextReactors } };
        }),
      );
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't update your reaction. Try again.");
    }
  }

  async function addReply(id: string, text: string) {
    if (!canComment || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      const record = await addReplyRequest(currentWorkspaceId, project.id, id, text);
      const reply: DiscussionReply = {
        id: record.id,
        author: currentActor,
        text: record.text,
        createdAt: new Date(record.createdAt).getTime(),
      };

      setDiscussions((current) =>
        current.map((d) => (d.id === id ? { ...d, replies: [...d.replies, reply] } : d)),
      );
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't post your reply. Try again.");
    }
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return discussions
      .filter((d) => typeFilter === "all" || d.type === typeFilter)
      .filter((d) => normalizedQuery === "" || d.body.toLowerCase().includes(normalizedQuery) || d.author.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (a.pinned === b.pinned ? b.createdAt - a.createdAt : a.pinned ? -1 : 1));
  }, [discussions, query, typeFilter]);

  const counts: Record<TypeFilter, number> = {
    all: discussions.length,
    update: discussions.filter((d) => d.type === "update").length,
    question: discussions.filter((d) => d.type === "question").length,
    announcement: discussions.filter((d) => d.type === "announcement").length,
  };

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Discussions</h2>
          <p className="text-ink-2" style={{ fontSize: 12.5 }}>Project-wide updates, questions, and announcements — not tied to any single task.</p>
          {mutationError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#B3564B" }}>{mutationError}</p>}
        </div>
        <div className="bg-card border-soft flex items-center" style={{ gap: 8, padding: "9px 13px", borderRadius: 12, width: 240 }}>
          <Search size={14} strokeWidth={1.8} color="var(--text-3)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search discussions…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", width: "100%" }}
          />
        </div>
      </div>

      {canComment && currentWorkspaceId && (
        <Composer
          actors={actors}
          currentActor={currentActor}
          workspaceId={currentWorkspaceId}
          projectId={project.id}
          canAttach={canEdit}
          onSubmit={handleSubmit}
        />
      )}

      <div className="flex items-center" style={{ gap: 4, flexWrap: "wrap", background: "var(--surface-2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {(["all", "update", "question", "announcement"] as TypeFilter[]).map((key) => {
          const isActive = typeFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "7px 13px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: isActive ? "var(--card)" : "transparent",
                color: isActive ? "var(--text)" : "var(--text-2)",
                boxShadow: isActive ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
              }}
            >
              {key === "all" ? "All" : DISCUSSION_TYPE_LABEL[key]} <span style={{ opacity: 0.65 }}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col" style={{ gap: 12 }}>
        {discussionsLoading ? (
          <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading discussions…</p>
          </div>
        ) : discussionsError ? (
          <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <MessagesSquare size={22} strokeWidth={1.6} color="var(--text-3)" />
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#B3564B" }}>Couldn't load discussions</p>
            <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>{discussionsError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <MessagesSquare size={22} strokeWidth={1.6} color="var(--text-3)" />
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>No discussions yet</p>
            <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>Be the first to post an update, ask a question, or share an announcement.</p>
          </div>
        ) : (
          filtered.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              actorNames={actorNames}
              currentActor={currentActor}
              canComment={canComment}
              canPin={canEdit}
              onTogglePin={() => togglePin(discussion.id)}
              onToggleReaction={(emoji) => toggleReaction(discussion.id, emoji)}
              onReply={(text) => addReply(discussion.id, text)}
            />
          ))
        )}
      </div>
    </div>
  );
}
