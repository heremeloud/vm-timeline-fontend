import api from "./api";
import type { CountResponse, Id, Playlist, Project, ProjectEpisode, ProjectFilmingDay, ProjectFittingWorkshop } from "../types/models";
import type { RelationshipChartData } from "../utils/relationshipChart";

export interface ProjectInput {
    show_relationship_chart?: boolean;
    relationship_chart?: RelationshipChartData | null;
    title?: string;
    original_title?: string | null;
    hashtag?: string | null;
    slug?: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
    thumbnail_focal_x?: number | null;
    thumbnail_focal_y?: number | null;
    is_visible?: boolean;
    year?: number | null;
    episode_count?: number | null;
    description?: string | null;
    playlist_ids?: Array<Playlist | string>;
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
    parent_project_id?: Id | null;
    start_date?: string | null;
    end_date?: string | null;
    author_ids?: Id[];
    filming_days?: ProjectFilmingDay[];
    episode_metadata?: ProjectEpisode[];
    fitting_workshops?: ProjectFittingWorkshop[];
}

export interface ProjectListParams {
    limit?: number;
    offset?: number;
    sort?: string;
    category?: string;
}

export const getProjects = ({ sort, category }: ProjectListParams = {}) => {
    let url = `/projects?sort=${sort || "newest"}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.get<Project[]>(url);
};

export const getProject = (id: Id | string) => api.get<{ project: Project }>(`/projects/${id}`);

export const getAdminProject = (id: Id | string) => api.get<{ project: Project }>(`/projects/admin/${id}`);

export const getAdminProjects = ({ limit = 50, offset = 0, sort = "newest", category }: ProjectListParams = {}) => {
    let url = `/projects/admin?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.get<Project[]>(url);
};

export const countAdminProjects = ({ category }: Pick<ProjectListParams, "category"> = {}) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    return api.get<CountResponse>(`/projects/admin/count?${params.toString()}`);
};

export const createProject = (data: ProjectInput) => api.post<Project>("/projects", data);

export const updateProject = (id: Id | string, data: ProjectInput) => api.patch<Project>(`/projects/${id}`, data);

export const deleteProject = (id: Id) => api.delete(`/projects/${id}`);

export const getProjectCategories = () => api.get<{ categories: string[] }>("/projects/categories");
