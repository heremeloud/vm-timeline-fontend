// Domain types mirroring the FastAPI serializers in vm-timeline-backend.
// Keep these in sync with the `_serialize_*` / `_enrich*` helpers in routers/.

import type { RelationshipChartData } from "../utils/relationshipChart";

export type Id = number;

export type Platform = "instagram" | "ig" | "x" | "tt" | (string & {});

export interface Author {
    id: Id;
    name: string;
    nickname?: string | null;
    full_name?: string | null;
    category: string;
    profile_photo_url?: string | null;
    ig_pfp_url?: string | null;
    twitter_pfp_url?: string | null;
    tiktok_pfp_url?: string | null;
    birthday?: string | null;
    twitter_url?: string | null;
    instagram_url?: string | null;
    broadcast_channel_name?: string | null;
    tiktok_url?: string | null;
    gmmtv_url?: string | null;
    mydramalist_url?: string | null;
    fc_url?: string | null;
    show_on_timeline: boolean;
    sort_order: number;
}

/** Compact author attached to events and projects. */
export interface AuthorSummary {
    id: Id;
    name: string;
    profile_photo_url?: string | null;
    ig_pfp_url?: string | null;
    twitter_pfp_url?: string | null;
    tiktok_pfp_url?: string | null;
}

// ---------- Posts ----------

export interface MediaItem {
    url: string;
    text?: string | null;
    translation?: string | null;
    note?: string | null;
    /** Broadcast-channel messages: "photo", "screenshot", … */
    attachment_type?: string | null;
}

export interface PostText {
    id: Id;
    post_id: Id;
    type: string;
    language: string;
    author_id?: Id | null;
    content?: string | null;
    translation?: string | null;
    posted_at?: string | null;
    media_url?: string | null;
    note?: string | null;
    parent_comment_id?: Id | null;
    author_name?: string | null;
    author_photo?: string | null;
    author_ig_pfp_url?: string | null;
    author_twitter_pfp_url?: string | null;
    author_tiktok_pfp_url?: string | null;
    author_instagram_url?: string | null;
}

export interface Post {
    id: Id;
    platform: Platform;
    content_type: string;
    external_url: string;
    external_id: string;
    author_id?: Id | null;
    temp_author_name?: string | null;
    temp_author_pfp_url?: string | null;
    caption?: string | null;
    caption_translation?: string | null;
    caption_translation_note?: string | null;
    show_translation_note: boolean;
    timeline_context?: string | null;
    show_timeline_context: boolean;
    show_on_related_page: boolean;
    posted_at?: string | null;
    posted_at_utc?: string | null;
    posted_at_is_estimated: boolean;
    sort_order: number;
    media_url?: string | null;
    media_urls_json: string;
    media_urls: MediaItem[];
    display_source: "external" | "r2" | (string & {});
    is_visible: boolean;
    is_adult: boolean;
    parent_id?: Id | null;
    author_name?: string | null;
    author_photo?: string | null;
    author_ig_pfp_url?: string | null;
    author_twitter_pfp_url?: string | null;
    author_tiktok_pfp_url?: string | null;
    author_instagram_url?: string | null;
    author_broadcast_channel_name?: string | null;
    /** Hydrated on timeline/thread responses. */
    comments?: PostText[];
    childrenPosts?: Post[];
}

export interface TimelinePage {
    items: Post[];
    has_more: boolean;
    last_updated?: string | null;
}

// ---------- Topics ----------

export interface TopicItem {
    id: Id;
    topic_id: Id;
    post_id: Id;
    happened_at?: string | null;
    label?: string | null;
    note?: string | null;
    show_replies: boolean;
    media_index?: number | null;
    media_indices: number[];
    sort_order: number;
    post: Post;
}

export interface Topic {
    id: Id;
    title: string;
    original_title?: string | null;
    slug?: string | null;
    description?: string | null;
    cover_url?: string | null;
    is_public: boolean;
    is_visible: boolean;
    created_at?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    sort_order: number;
    items: TopicItem[];
}

// ---------- Projects ----------

export interface Playlist {
    id: string;
    name?: string;
}

export interface ProjectFilmingDay {
    id?: Id;
    q_number: number;
    filming_date?: string | null;
    hashtag?: string | null;
    keyword?: string | null;
}

export interface ProjectEpisode {
    id?: Id;
    episode_number: number;
    air_date?: string | null;
    title?: string | null;
    hashtag?: string | null;
    keyword?: string | null;
}

/** The slice of a project shown on related-project links. */
export interface ProjectSummary {
    id: Id;
    title: string;
    slug?: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
    thumbnail_focal_x?: number | null;
    thumbnail_focal_y?: number | null;
}

export interface Project {
    id: Id;
    title: string;
    original_title?: string | null;
    hashtag?: string | null;
    slug?: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
    thumbnail_focal_x?: number | null;
    thumbnail_focal_y?: number | null;
    is_visible: boolean;
    year?: number | null;
    episode_count?: number | null;
    description?: string | null;
    parent_project_id?: Id | null;
    parent_project?: ProjectSummary | null;
    child_projects?: ProjectSummary[];
    playlist_id?: string | null;
    playlists: Playlist[];
    announcement_url?: string | null;
    tweet_url?: string | null;
    tweet_label?: string | null;
    youtube_url?: string | null;
    youtube_label?: string | null;
    mydramalist_url?: string | null;
    gmmtv_url?: string | null;
    official_twitter_url?: string | null;
    spotify_url?: string | null;
    apple_music_url?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    show_relationship_chart: boolean;
    relationship_chart?: RelationshipChartData | null;
    authors: AuthorSummary[];
    filming_days?: ProjectFilmingDay[];
    episode_metadata?: ProjectEpisode[];
    events?: Event[];
}

// ---------- Events ----------

export interface EventPhoto {
    url: string;
    date?: string | null;
    focal_x?: number | null;
    focal_y?: number | null;
}

export interface EventDateItem {
    date: string;
    keyword?: string | null;
    hashtag?: string | null;
}

export interface LiveMediaItem {
    url: string;
    keyword?: string | null;
    hashtag?: string | null;
}

export interface ChildEvent {
    id: Id;
    name: string;
    english_name?: string | null;
    event_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    category?: string | null;
    subcategory?: string | null;
    dates?: string[];
    date_items?: EventDateItem[];
    media_urls?: string[];
    photo_items?: EventPhoto[];
}

export interface Event {
    id: Id;
    name: string;
    english_name?: string | null;
    location?: string | null;
    keyword?: string | null;
    category?: string | null;
    subcategory?: string | null;
    tags: string[];
    photo_items: EventPhoto[];
    media_urls: string[];
    dates: string[];
    date_items: EventDateItem[];
    media_url?: string | null;
    media_focal_x?: number | null;
    media_focal_y?: number | null;
    is_visible: boolean;
    event_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    /** Admin-only fields. */
    announcement_urls?: string[];
    private_notes?: string | null;
    live_urls: string[];
    live_media_items: LiveMediaItem[];
    project_id?: Id | null;
    project_title?: string | null;
    project_thumbnail_url?: string | null;
    project_thumbnail_focal_x?: number | null;
    project_thumbnail_focal_y?: number | null;
    project_category?: string | null;
    parent_event_id?: Id | null;
    parent_event_name?: string | null;
    child_events: ChildEvent[];
    authors: AuthorSummary[];
}

export interface EventView {
    id: Id;
    title: string;
    slug: string;
    is_visible: boolean;
    name_filter?: string | null;
    category?: string | null;
    subcategory?: string | null;
    author?: string | null;
    event_sort: string;
    view_mode: "list" | "calendar" | (string & {});
    sort_order: number;
}

export interface EventSubcategoryOption {
    id?: Id;
    value: string;
    label: string;
    sort_order: number;
}

export interface EventCategoryOption {
    id?: Id;
    value: string;
    label: string;
    sort_order: number;
    subcategories: EventSubcategoryOption[];
}

export interface CountResponse {
    count: number;
}

/** An entry of /events/tag-index: an event, or a project/episode that owns a hashtag. */
export interface EventTagEntry {
    id?: Id;
    name?: string;
    is_project?: boolean;
    project_id?: Id | null;
    category?: string | null;
    tags?: string[];
    dates?: string[];
    date_items?: EventDateItem[];
    start_date?: string | null;
    end_date?: string | null;
    event_date?: string | null;
    [extra: string]: unknown;
}
