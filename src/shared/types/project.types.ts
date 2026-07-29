export interface SeoProject {
  id: string;
  name: string;
  startUrl: string;
  domain: string;
  /** @deprecated use keywords */
  keyword?: string;
  /** Keys for SERP checks — set on create and/or added later. */
  keywords?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastHealthScore?: number | null;
  lastCheckedAt?: string | null;
}

export interface ProjectMemoryNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface ProjectMemoryFile {
  notes: ProjectMemoryNote[];
}

export interface ProjectIndex {
  activeId: string | null;
  projects: SeoProject[];
}

export interface CreateProjectInput {
  name: string;
  startUrl: string;
  keyword?: string;
  keywords?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  startUrl?: string;
  keyword?: string;
  keywords?: string[];
  notes?: string;
  lastHealthScore?: number | null;
  lastCheckedAt?: string | null;
}
