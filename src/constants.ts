export const projectsPerPage = 7;
export const maxDescriptionLength = 150;
export const githubUsername = "rosendo2015";
export const themeStorageKey = "francisco-rosendo-theme";
export const featuredProjectsStorageKey = "francisco-rosendo-featured-projects";
export const featuredProjectsCount = 4;
export const emailjsServiceId = "service_8445fsm";
export const emailjsTemplateId = "template_npdrogd";
export const emailjsPublicKey = "rjXcsQQ9xF-NCzc54";

export const projectCategoryLabels: Record<
  import("./types").ProjectCategory,
  string
> = {
  frontend: "Front-end",
  backend: "Back-end",
  fullstack: "Fullstack",
  other: "Outros",
};

export const readmeImageCache = new Map<number, string | null>();
