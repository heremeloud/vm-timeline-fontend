import api from "./api";
import type { SearchSettings, TypoTolerance } from "../types/models";

export interface SearchSettingsInput {
    identity_tags: string[];
    typo_tolerance: TypoTolerance;
}

export const getSearchSettings = () => api.get<SearchSettings>("/search-settings");

export const updateSearchSettings = (data: SearchSettingsInput) => api.put<SearchSettings>("/search-settings", data);
