export type GitHubRepository = {
  id: number;
  name: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
};

export type ProjectFilter = "all" | "deployed";
export type ProjectCategory = "frontend" | "backend" | "fullstack" | "other";
export type ProjectCategoryFilter = ProjectCategory | "all";
export type Theme = "light" | "dark";
