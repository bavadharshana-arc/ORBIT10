import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
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
  Reply as ReplyIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Discussion, DiscussionType } from "../../types/workspace";
import { loadMembers } from "../../data/teamData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { usePersistedState } from "../../hooks/usePersistedState";
import {
  discussionsKey,
  seedDiscussionsForProject,
  getProjectActors,
  resolveCurrentActor,
  generateId,
  formatRelativeTime,
  REACTION_EMOJIS,
  DISCUSSION_TYPE_LABEL,
  appendProjectActivity,
  appendProjectFile,
  inferFileKind,
  setSessionObjectUrl,
  canEditProjectContent,
  canCommentOnProject,
} from "../../data/workspaceData";
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
============================================================ */

interface ComposerProps {
  actors: { id: string; name: string; initials: string; bg: string; fg?: string }[];
  currentActor: { id: string; name: string; initials: string; bg: string; fg?: string };
  projectId: string;
  /** Editor+ only — Commenters can post/mention but not attach files (matches the Files tab's upload gate). */
  canAttach: boolean;
  onSubmit: (discussion: Discussion) => void;
}

function Composer({ actors, currentActor, projectId, canAttach, onSubmit }: ComposerProps) {
  const [type, setType] = useState<DiscussionType>("update");
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Discussion["attachments"]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleAttach(event: ChangeEvent<HTMLInputElement>) {
    if (!canAttach) return;
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    const added: Discussion["attachments"] = Array.from(selected).map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileId = generateId("file");
      setSessionObjectUrl(fileId, URL.createObjectURL(file));
      appendProjectFile(projectId, {
        id: fileId,
        projectId,
        name: file.name.replace(/\.[^.]+$/, ""),
        extension,
        kind: inferFileKind(extension),
        sizeBytes: file.size,
        folder: "Discussions",
        uploadedBy: currentActor,
        uploadedAt: Date.now(),
      });
      return { fileId, name: file.name, sizeBytes: file.size };
    });

    setAttachments((current) => [...current, ...added]);
    event.target.value = "";
  }

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    const discussion: Discussion = {
      id: generateId("discussion"),
      projectId,
      type,
      body: trimmed,
      author: currentActor,
      createdAt: Date.now(),
      pinned: false,
      mentions,
      attachments,
      reactions: {},
      replies: [],
    };

    onSubmit(discussion);
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
                    onClick={() => setAttachments((current) => current.filter((a) => a.fileId !== attachment.fileId))}
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
              <>
                <input ref={fileInputRef} type="file" multiple onChange={handleAttach} style={{ display: "none" }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center"
                  style={{ gap: 6, border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, padding: "7px 12px", fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", cursor: "pointer" }}
                >
                  <Paperclip size={12} /> Attach
                </button>
              </>
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
   DISCUSSIONS TAB
============================================================ */

type TypeFilter = "all" | DiscussionType;

export function ProjectDiscussionsTab() {
  const { project, permission } = useProjectWorkspace();
  const canEdit = canEditProjectContent(permission);
  const canComment = canCommentOnProject(permission);
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const actors = useMemo(() => getProjectActors(project, members), [project, members]);
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const actorNames = useMemo(() => actors.map((a) => a.name), [actors]);

  const [discussions, setDiscussions] = usePersistedState<Discussion[]>(discussionsKey(project.id), () => seedDiscussionsForProject(project, members));
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  function handleSubmit(discussion: Discussion) {
    if (!canComment) return;
    setDiscussions((current) => [discussion, ...current]);
    appendProjectActivity(project.id, {
      type: "discussion_posted",
      text: `${currentActor.name} posted ${discussion.type === "announcement" ? "an" : "a"} ${DISCUSSION_TYPE_LABEL[discussion.type].toLowerCase()}`,
      actor: currentActor,
    });
  }

  function togglePin(id: string) {
    if (!canEdit) return;
    setDiscussions((current) => current.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d)));
  }

  function toggleReaction(id: string, emoji: string) {
    if (!canComment) return;
    setDiscussions((current) =>
      current.map((d) => {
        if (d.id !== id) return d;
        const reactors = d.reactions[emoji] ?? [];
        const nextReactors = reactors.includes(currentActor.id) ? reactors.filter((r) => r !== currentActor.id) : [...reactors, currentActor.id];
        return { ...d, reactions: { ...d.reactions, [emoji]: nextReactors } };
      })
    );
  }

  function addReply(id: string, text: string) {
    if (!canComment) return;
    setDiscussions((current) =>
      current.map((d) =>
        d.id === id
          ? { ...d, replies: [...d.replies, { id: generateId("reply"), author: currentActor, text, createdAt: Date.now() }] }
          : d
      )
    );
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

      {canComment && (
        <Composer actors={actors} currentActor={currentActor} projectId={project.id} canAttach={canEdit} onSubmit={handleSubmit} />
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
        {filtered.length === 0 ? (
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
