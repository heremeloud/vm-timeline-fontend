import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";
import "../styles/PostCard.css";
import { getTextsByPost } from "../api/textsService";
import {
    getAdminThread,
    getThread,
    deletePost,
    updatePost,
} from "../api/postsService";
import { ROUTES } from "../routes";
import { getEventTagLinkPath } from "../utils/eventTagLinkPath";
import { describeLinkTarget, getEventTagLinks } from "../utils/eventTagLinks";

import { isVideo } from "../utils/media";
import InstagramEmbed from "./InstagramEmbed";
import InstagramBroadcast from "./InstagramBroadcast";
import TweetEmbed from "./TweetEmbed";
import TikTokEmbed from "./TikTokEmbed";
import AdultTweetCard from "./AdultTweetCard";
import EventLinkedText from "./EventLinkedText";
import EventTagAnchor from "./EventTagAnchor";

import IGReply from "./IGReply";
import TweetReply from "./TweetReply";
import TikTokReply from "./TikTokReply";
import { Alert, Button, ButtonLink, Checkbox, Textarea } from "../ui";
import { errorDetail } from "../utils/errors";
import type { EventTagIndex } from "../utils/eventTagLinks";
import type { Post, PostText } from "../types/models";
import { isAdminView } from "../utils/adminView";

export interface PostCardProps {
    post: Post;
    showReplies?: boolean;
    eventTagIndex?: EventTagIndex | null;
}

export default function PostCard({
    post,
    showReplies = true,
    eventTagIndex = null,
}: PostCardProps) {
    const location = useLocation();
    const isAdmin = isAdminView();
    const returnTo = `${location.pathname}${location.search}`;
    const isInstagram = post.platform === "ig" || post.platform === "instagram";
    const isBroadcast = isInstagram && post.content_type === "broadcast";
    const isTwitter = post.platform === "x" || post.platform === "twitter";
    const isTikTok = post.platform === "tt" || post.platform === "tiktok";
    const platformTone = isBroadcast
        ? "broadcast"
        : isInstagram
          ? "instagram"
          : isTwitter
            ? "x"
            : "tiktok";
    const rendersAdultFallback = Boolean(post.is_adult);
    const [timelineContext, setTimelineContext] = useState(post.timeline_context || "");
    const [showTimelineContext, setShowTimelineContext] = useState(Boolean(post.show_timeline_context));
    const [showOnRelatedPage, setShowOnRelatedPage] = useState(post.show_on_related_page !== false);
    const [contextEditorOpen, setContextEditorOpen] = useState(false);
    const [contextDraft, setContextDraft] = useState(post.timeline_context || "");
    const [showContextDraft, setShowContextDraft] = useState(Boolean(post.show_timeline_context));
    const [showRelatedDraft, setShowRelatedDraft] = useState(post.show_on_related_page !== false);
    const [savingContext, setSavingContext] = useState(false);
    const [contextError, setContextError] = useState("");
    const postForLinks = useMemo(() => ({
        ...post,
        timeline_context: timelineContext || null,
        show_timeline_context: showTimelineContext,
        show_on_related_page: showOnRelatedPage,
    }), [post, timelineContext, showTimelineContext, showOnRelatedPage]);
    const eventTagLinks = useMemo(
        () => getEventTagLinks(postForLinks, eventTagIndex),
        [postForLinks, eventTagIndex],
    );
    const standaloneEventTagLinks = useMemo(() => {
        // Keywords are linked inside the "Related Event / Project" text itself, never as separate chips.
        const hashtagLinks = eventTagLinks.filter(({ kind }) => kind !== "keyword");
        if (!timelineContext || !showTimelineContext)
            return hashtagLinks;
        const contextTags = new Set(
            (timelineContext.match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map(
                (tag: string) => tag.slice(1).toLocaleLowerCase(),
            ),
        );
        return hashtagLinks.filter(
            ({ hashtag }) =>
                !contextTags.has(hashtag.replace(/^#/, "").toLocaleLowerCase()),
        );
    }, [eventTagLinks, timelineContext, showTimelineContext]);

    // Hashtag chips sit under posts without a translation; project rows picked in the form always show.
    const hasTranslation = Boolean(post.caption_translation) || Boolean(post.caption_translation_note && (post.show_translation_note ?? true));
    const chipLinks = standaloneEventTagLinks.filter((link) => link.kind === "entry" || !hasTranslation);

    // Admin only: everything this post links to, even where a checkbox keeps the link off the public page.
    const adminLinks = useMemo(() => {
        if (!isAdmin || !eventTagIndex) return [];
        return getEventTagLinks(postForLinks, eventTagIndex, { includeHiddenTimelineContext: true }).map((link) => ({
            link,
            target: describeLinkTarget(link, eventTagIndex),
            publicLink: eventTagLinks.some((shown) => shown.hashtag === link.hashtag && shown.kind === link.kind),
        }));
    }, [isAdmin, eventTagIndex, postForLinks, eventTagLinks]);

    const [comments, setComments] = useState<PostText[]>([]);
    const [childrenPosts, setChildrenPosts] = useState<Post[]>([]);
    const [isPublic, setIsPublic] = useState(post.is_visible !== false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    function openContextEditor() {
        setContextDraft(timelineContext);
        setShowContextDraft(showTimelineContext);
        setShowRelatedDraft(showOnRelatedPage);
        setContextError("");
        setContextEditorOpen(true);
    }

    function cancelContextEditor() {
        setContextDraft(timelineContext);
        setShowContextDraft(showTimelineContext);
        setShowRelatedDraft(showOnRelatedPage);
        setContextError("");
        setContextEditorOpen(false);
    }

    async function saveContext(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextContext = contextDraft.trim();
        const nextShowContext = Boolean(nextContext) && showContextDraft;
        setSavingContext(true);
        setContextError("");
        try {
            await updatePost(post.id, {
                timeline_context: nextContext || null,
                show_timeline_context: nextShowContext,
                show_on_related_page: showRelatedDraft,
            });
            setTimelineContext(nextContext);
            setShowTimelineContext(nextShowContext);
            setShowOnRelatedPage(showRelatedDraft);
            setContextEditorOpen(false);
        } catch (err) {
            console.error("Related Event / Project update failed:", err);
            setContextError(errorDetail(err, "Could not update Related Event / Project."));
        } finally {
            setSavingContext(false);
        }
    }

    async function toggleContextVisibility(nextValue: boolean) {
        if (!timelineContext) return;
        const previousValue = showTimelineContext;
        setShowTimelineContext(nextValue);
        setSavingContext(true);
        setContextError("");
        try {
            await updatePost(post.id, { show_timeline_context: nextValue });
        } catch (err) {
            setShowTimelineContext(previousValue);
            console.error("Related Event / Project visibility update failed:", err);
            setContextError(errorDetail(err, "Could not update Related Event / Project visibility."));
        } finally {
            setSavingContext(false);
        }
    }

    async function toggleRelatedPageVisibility(nextValue: boolean) {
        const previousValue = showOnRelatedPage;
        setShowOnRelatedPage(nextValue);
        setSavingContext(true);
        setContextError("");
        try {
            await updatePost(post.id, { show_on_related_page: nextValue });
        } catch (err) {
            setShowOnRelatedPage(previousValue);
            console.error("Related page visibility update failed:", err);
            setContextError(errorDetail(err, "Could not update related-page visibility."));
        } finally {
            setSavingContext(false);
        }
    }

    async function togglePublicVisibility() {
        const nextValue = !isPublic;
        setIsPublic(nextValue);
        setSavingVisibility(true);

        try {
            await updatePost(post.id, { is_visible: nextValue });
        } catch (err) {
            setIsPublic(!nextValue);
            console.error("Visibility update failed:", err);
            alert("Could not update this post's public visibility.");
        } finally {
            setSavingVisibility(false);
        }
    }

    async function handleDeletePost() {
        if (!confirm("Delete this post?")) return;

        try {
            await deletePost(post.id);
            window.location.reload();
        } catch (err) {
            console.error("Delete post failed:", err);
            alert(
                "Delete failed: " +
                    errorDetail(err, err instanceof Error ? err.message : "Unknown error"),
            );
        }
    }

    function saveReturnScroll() {
        sessionStorage.setItem(
            "homeTimelineReturnScrollY",
            String(window.scrollY),
        );
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                if (!showReplies) {
                    if (!cancelled) {
                        setComments([]);
                        setChildrenPosts([]);
                    }
                    return;
                }
                if (Array.isArray(post.comments) && Array.isArray(post.childrenPosts)) {
                    if (!cancelled) {
                        setComments(post.comments);
                        setChildrenPosts(post.childrenPosts);
                    }
                    if (isTwitter) setTimeout(() => window.twttr?.widgets?.load(), 150);
                    return;
                }

                // Always load PostText (used by IG + TikTok)
                const cRes = await getTextsByPost(post.id);
                if (!cancelled) setComments(cRes.data);

                // Only X uses child-post threads
                if (isTwitter) {
                    const tRes = await (isAdmin
                        ? getAdminThread(post.id)
                        : getThread(post.id));
                    if (!cancelled) setChildrenPosts(tRes.data);

                    // refresh Twitter embeds
                    setTimeout(() => window.twttr?.widgets?.load(), 150);
                } else {
                    if (!cancelled) setChildrenPosts([]);
                }
            } catch (err) {
                console.error("PostCard load error:", err);
                if (!cancelled) {
                    setComments([]);
                    setChildrenPosts([]);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [post.id, post.comments, post.childrenPosts, isTwitter, showReplies, isAdmin]);

    // IG replies: flat list (translation + note live on the same record)
    const igReplies = useMemo(() => {
        if (!isInstagram) return [];
        return comments.filter((c) => c.type === "ig-reply");
    }, [comments, isInstagram]);

    // TikTok replies: flat list
    const ttReplies = useMemo(() => {
        if (!isTikTok) return [];
        return comments.filter((c) => c.type === "tt-reply");
    }, [comments, isTikTok]);

    return (
        <div className={`post-wrapper ui-content-card ui-content-card--post ui-platform-${platformTone}`}>
            {(post.posted_at || isAdmin) && (
                <div className="post-card-topline">
                    {post.posted_at && (
                        <div className="post-date">
                            <span className={`post-platform-dot post-platform-dot--${platformTone}`} />
                            <span className="post-platform-name">
                                {isBroadcast
                                    ? "Instagram Broadcast Channel"
                                    : isInstagram
                                      ? "Instagram"
                                      : isTwitter
                                        ? "X (Twitter)"
                                        : "TikTok"}
                            </span>
                            <span className="post-date-sep">·</span>
                            {isAdmin && post.posted_at_utc
                                ? new Date(post.posted_at_utc).toLocaleString("en-US", {
                                      timeZone: "Asia/Bangkok",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      timeZoneName: "short",
                                  })
                                : new Date(
                                      post.posted_at + "T00:00:00",
                                  ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                  })}
                            {isAdmin &&
                                post.posted_at_utc &&
                                post.posted_at_is_estimated &&
                                " (estimated)"}
                        </div>
                    )}
                    {isAdmin && (
                        <div className="post-card-admin-actions">
                            <label
                                className="post-visibility-toggle"
                                title={isPublic ? "Visible to the public" : "Hidden from the public"}
                            >
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    disabled={savingVisibility}
                                    onChange={togglePublicVisibility}
                                    aria-label="Show this post to the public"
                                />
                                <span>{savingVisibility ? "Saving…" : "Public"}</span>
                            </label>
                        </div>
                    )}
                </div>
            )}
            <div className="post-embed">
                {rendersAdultFallback ? (
                    isTwitter ? (
                        <AdultTweetCard
                            tweet={post}
                            eventTagLinks={eventTagLinks}
                        />
                    ) : (
                        <div className="post-adult-card">
                            {post.author_name && (
                                <div className="post-adult-author">
                                    {post.author_name}
                                </div>
                            )}
                            {post.external_url && (
                                <a
                                    href={post.external_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="post-adult-source"
                                >
                                    {isInstagram
                                        ? "Instagram post"
                                        : isTwitter
                                          ? "Tweet"
                                          : "TikTok"}{" "}
                                    ↗
                                </a>
                            )}
                            {post.caption && (
                                <p className="post-adult-caption">
                                    <EventLinkedText
                                        text={post.caption}
                                        eventTagLinks={eventTagLinks}
                                    />
                                </p>
                            )}
                            {post.caption_translation && (
                                <p className="post-adult-translation">
                                    <EventLinkedText
                                        text={post.caption_translation}
                                        eventTagLinks={eventTagLinks}
                                    />
                                </p>
                            )}
                            {post.caption_translation_note &&
                                (post.show_translation_note ?? true) && (
                                    <p className="post-adult-note">
                                        📝{" "}
                                        <EventLinkedText
                                            text={post.caption_translation_note}
                                            eventTagLinks={eventTagLinks}
                                        />
                                    </p>
                                )}
                            {post.media_url &&
                                (isVideo(post.media_url) ? (
                                    <video
                                        src={post.media_url}
                                        controls
                                        playsInline
                                        muted
                                        className="post-adult-media"
                                    />
                                ) : (
                                    <img
                                        src={post.media_url}
                                        alt=""
                                        className="post-adult-media"
                                    />
                                ))}
                        </div>
                    )
                ) : (
                    <>
                        {isInstagram && !isBroadcast && (
                            <InstagramEmbed
                                external_url={post.external_url}
                                media_url={post.media_url}
                                media_urls={post.media_urls || []}
                                display_source={post.display_source}
                                content_type={post.content_type}
                                caption={post.caption}
                                author_id={post.author_id}
                                author_name={post.author_name}
                                author_photo={post.author_photo}
                                author_ig_pfp_url={post.author_ig_pfp_url}
                                author_instagram_url={post.author_instagram_url}
                            />
                        )}

                        {isBroadcast && (
                            <InstagramBroadcast
                                messages={post.media_urls || []}
                                channelName={post.author_broadcast_channel_name}
                                externalUrl={post.external_url}
                                authorName={post.author_name}
                                authorPhoto={
                                    post.author_ig_pfp_url || post.author_photo
                                }
                                authorId={post.author_id}
                                instagramUrl={post.author_instagram_url}
                            />
                        )}

                        {isTwitter && <TweetEmbed url={post.external_url} />}

                        {isTikTok && (
                            <TikTokEmbed
                                external_url={post.external_url}
                                media_url={post.media_url}
                            />
                        )}
                    </>
                )}
            </div>

            {(post.caption_translation ||
                (post.caption_translation_note &&
                    (post.show_translation_note ?? true))) &&
                !rendersAdultFallback && (
                    <div className="post-caption-translation">
                        {post.caption_translation && (
                            <p>
                                <EventLinkedText
                                    text={post.caption_translation}
                                    eventTagLinks={eventTagLinks}
                                />
                            </p>
                        )}
                        {post.caption_translation_note &&
                            (post.show_translation_note ?? true) && (
                                <p className="post-translation-note">
                                    📝{" "}
                                    <EventLinkedText
                                        text={post.caption_translation_note}
                                        eventTagLinks={eventTagLinks}
                                    />
                                </p>
                            )}
                    </div>
                )}

            {isAdmin ? (
                <aside
                    className={`post-timeline-context post-timeline-context--admin${!timelineContext ? " is-empty" : showTimelineContext ? "" : " is-hidden"}`}
                    aria-label="Edit Related Event / Project"
                >
                    {contextEditorOpen ? (
                        <form className="post-context-editor" onSubmit={saveContext}>
                            <label className="post-timeline-context-label" htmlFor={`post-context-${post.id}`}>
                                Related Event / Project <span className="form-optional">(optional)</span>
                            </label>
                            <Textarea
                                id={`post-context-${post.id}`}
                                rows={3}
                                value={contextDraft}
                                disabled={savingContext}
                                placeholder="Explain what this post relates to. Add an event or project hashtag to link it."
                                onChange={(event) => setContextDraft(event.target.value)}
                                autoFocus
                            />
                            <Checkbox
                                label="Show Related Event / Project to visitors"
                                checked={showContextDraft}
                                disabled={savingContext || !contextDraft.trim()}
                                onChange={(event) => setShowContextDraft(event.target.checked)}
                            />
                            <Checkbox
                                label="Show post on related event page (even if hidden from the TL)"
                                checked={showRelatedDraft}
                                disabled={savingContext}
                                onChange={(event) => setShowRelatedDraft(event.target.checked)}
                            />
                            {contextError && <Alert variant="error">{contextError}</Alert>}
                            <div className="post-context-editor-actions">
                                <Button type="submit" variant="save" size="small" disabled={savingContext}>
                                    {savingContext ? "Saving…" : "Save"}
                                </Button>
                                <Button variant="secondary" size="small" disabled={savingContext} onClick={cancelContextEditor}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="post-timeline-context-header">
                                <div className="post-timeline-context-label">
                                    Related Event / Project
                                </div>
                                <div className="post-context-visibility-controls">
                                    {timelineContext ? (
                                        <>
                                            <Checkbox
                                                className="post-context-visibility-toggle"
                                                label={savingContext ? "Saving…" : "Visible to visitors"}
                                                title="Display the Related Event / Project text to visitors"
                                                checked={showTimelineContext}
                                                disabled={savingContext}
                                                onChange={(event) => void toggleContextVisibility(event.target.checked)}
                                            />
                                            <Checkbox
                                                className="post-context-visibility-toggle"
                                                label="On related page"
                                                title="Show this post on its related event or project page, even if it is hidden from the timeline"
                                                checked={showOnRelatedPage}
                                                disabled={savingContext}
                                                onChange={(event) => void toggleRelatedPageVisibility(event.target.checked)}
                                            />
                                            <Button variant="ghost" size="small" disabled={savingContext} onClick={openContextEditor}>Edit</Button>
                                        </>
                                    ) : (
                                        <Button variant="add" size="compact" onClick={openContextEditor}>
                                            + Add # / Keyword
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {timelineContext && (
                                <p>
                                    {/* Admins can follow the link even while "Visible to visitors" is off. */}
                                    <EventLinkedText
                                        text={timelineContext}
                                        eventTagLinks={adminLinks.map(({ link }) => link)}
                                    />
                                </p>
                            )}
                            {contextError && <Alert variant="error">{contextError}</Alert>}
                        </>
                    )}
                </aside>
            ) : timelineContext && showTimelineContext ? (
                <aside className="post-timeline-context" aria-label=", added by the timeline curator">
                    <div className="post-timeline-context-label">
                        Related Event / Project
                    </div>
                    <p>
                        <EventLinkedText
                            text={timelineContext}
                            eventTagLinks={eventTagLinks}
                        />
                    </p>
                </aside>
            ) : null}

            {/* Separate media block for X.
          If TweetEmbed already handles media, can remove this. */}
            {isTwitter && post.media_url && !rendersAdultFallback && (
                <div className="post-media">
                    <img src={post.media_url} alt="" />
                </div>
            )}

            {!rendersAdultFallback &&
                chipLinks.length > 0 && (
                    <div
                        className="post-event-tags"
                        aria-label="Related events"
                    >
                        {chipLinks.map(
                            (link) => {
                                const { hashtag, event, projectId, projectEntryType, projectEntryNumber } = link;
                                return (
                                <EventTagAnchor
                                    key={`${hashtag}-${event.id}`}
                                    to={getEventTagLinkPath(link)}
                                    className="post-event-tag-link"
                                    title={
                                        projectEntryType && Number.isFinite(projectEntryNumber)
                                            ? "View related posts"
                                            : projectId
                                            ? "View related project"
                                            : `View event: ${event.name}`
                                    }
                                >
                                    {hashtag}
                                </EventTagAnchor>
                                );
                            },
                        )}
                    </div>
                )}

            {isAdmin && adminLinks.length > 0 && (
                <div className="post-admin-links" aria-label="Admin: where this post links">
                    <span className="post-admin-links-label">Links to</span>
                    {adminLinks.map(({ link, target, publicLink }) => (
                        <span
                            key={`${link.kind}-${link.hashtag}`}
                            className={`post-admin-link${publicLink ? "" : " is-hidden"}`}
                            title={publicLink ? undefined : "Not linked on the public post: \"Show Related Event / Project\" is off"}
                        >
                            <span>
                                {target.kind === "event" ? "Event" : target.kind === "project" ? "Project" : "Project entry"}:{" "}
                                <EventTagAnchor to={getEventTagLinkPath(link)} className="post-admin-link-target">{target.label}</EventTagAnchor>
                            </span>
                            {!publicLink && <span className="post-admin-link-note">(hidden)</span>}
                        </span>
                    ))}
                    {!showOnRelatedPage && (
                        <span className="post-admin-link-note">Not listed on related pages</span>
                    )}
                </div>
            )}

            {showReplies && isInstagram && igReplies.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Instagram Reply</span>
                    {igReplies.map((reply) => (
                        <IGReply key={reply.id} reply={reply} />
                    ))}
                </div>
            )}

            {showReplies && isTikTok && ttReplies.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">TikTok Reply</span>
                    {ttReplies.map((reply) => (
                        <TikTokReply key={reply.id} reply={reply} />
                    ))}
                </div>
            )}

            {showReplies && isTwitter && childrenPosts.length > 0 && (
                <div className="reply-section">
                    <span className="reply-section-label">Tweet Reply</span>
                    {childrenPosts.map((child) => (
                        <TweetReply key={child.id} reply={child} />
                    ))}
                </div>
            )}

            {isAdmin && (
                <div className="post-actions">
                    <div className="post-action-row">
                        <ButtonLink
                            to={ROUTES.addReply(post.id)}
                            state={{ returnTo }}
                            onClick={saveReturnScroll}
                            variant="add"
                            size="card"
                        >
                            {isInstagram
                                ? "+ Add IG Reply"
                                : isTikTok
                                  ? "+ Add TT Reply"
                                  : "+ Add TWT Reply"}
                        </ButtonLink>

                        <ButtonLink
                            to={ROUTES.editPost(post.id)}
                            state={{ returnTo }}
                            onClick={saveReturnScroll}
                            variant="primary"
                            size="card"
                        >
                            Edit Post
                        </ButtonLink>
                        <Button variant="danger" size="card" onClick={handleDeletePost}>
                            Delete Post
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
