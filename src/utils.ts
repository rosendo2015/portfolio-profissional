import type { GitHubRepository, ProjectCategory, Theme } from "./types";
import {
  githubUsername,
  readmeImageCache,
  featuredProjectsStorageKey,
  featuredProjectsCount,
  themeStorageKey,
  maxDescriptionLength,
} from "./constants";

// Utility functions
export function getReadmeImageUrl(
  markdown: string,
  repository: GitHubRepository,
): string | undefined {
  const markdownImages = Array.from(
    markdown.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g),
    (match) => match[1] ?? match[2],
  );
  const htmlImages = Array.from(
    markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)['"][^>]*>/gi),
    (match) => match[1],
  );
  const imageUrl = [...markdownImages, ...htmlImages].find(
    (url) => url && !/(badge|shield|actions\/workflows)/i.test(url),
  );

  if (!imageUrl) {
    return undefined;
  }

  try {
    const resolvedUrl = new URL(
      imageUrl,
      `https://raw.githubusercontent.com/${githubUsername}/${repository.name}/${repository.default_branch}/`,
    );

    if (
      resolvedUrl.hostname === "github.com" &&
      resolvedUrl.pathname.includes("/blob/")
    ) {
      resolvedUrl.hostname = "raw.githubusercontent.com";
      resolvedUrl.pathname = resolvedUrl.pathname.replace("/blob/", "/");
    }

    return resolvedUrl.protocol === "https:" ? resolvedUrl.href : undefined;
  } catch {
    return undefined;
  }
}

export async function loadRepositoryImage(
  repository: GitHubRepository,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (readmeImageCache.has(repository.id)) {
    return readmeImageCache.get(repository.id) ?? undefined;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubUsername}/${encodeURIComponent(repository.name)}/readme`,
      {
        headers: { Accept: "application/vnd.github.raw+json" },
        signal,
      },
    );

    if (!response.ok) {
      readmeImageCache.set(repository.id, null);
      return undefined;
    }

    const imageUrl = getReadmeImageUrl(await response.text(), repository);
    readmeImageCache.set(repository.id, imageUrl ?? null);
    return imageUrl;
  } catch {
    if (!signal.aborted) {
      readmeImageCache.set(repository.id, null);
    }

    return undefined;
  }
}

export function getProjectDescription(repository: GitHubRepository): string {
  const description = repository.description?.trim();

  if (description) {
    return description.length > maxDescriptionLength
      ? `${description.slice(0, maxDescriptionLength - 3).trimEnd()}...`
      : description;
  }

  const topics = repository.topics.slice(0, 3).join(", ");

  if (topics && repository.language) {
    return `Projeto de ${topics}, desenvolvido em ${repository.language}.`;
  }

  if (topics) {
    return `Projeto sobre ${topics}.`;
  }

  if (repository.language) {
    return `Projeto desenvolvido principalmente em ${repository.language}.`;
  }

  return "Projeto pessoal desenvolvido por Francisco Rosendo.";
}

export function getTechnologyColor(technology: string): number {
  let hash = 0;

  for (const character of technology) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return Math.abs(hash) % 6;
}

export function getSavedFeaturedProjectIds(): number[] {
  try {
    const savedIds = window.localStorage.getItem(featuredProjectsStorageKey);
    const parsedIds: unknown = savedIds ? JSON.parse(savedIds) : [];

    if (!Array.isArray(parsedIds)) {
      return [];
    }

    return Array.from(
      new Set(
        parsedIds.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id),
        ),
      ),
    ).slice(0, featuredProjectsCount);
  } catch {
    return [];
  }
}

export function getProjectCategory(repository: GitHubRepository): ProjectCategory {
  const metadata = [
    repository.name,
    repository.description ?? "",
    ...repository.topics,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[-_./]+/g, " ");
  const hasFrontendSignal =
    /\b(front\s?end|ui|ux|landing|dashboard|react|vue|angular|svelte|next\s?js|vite|tailwind|html|css|interface|component|responsive|testimonial|coming soon|portfolio|website|web design|form|section|calculator|recipe|weather|blog)\b/.test(
      metadata,
    ) || ["HTML", "CSS"].includes(repository.language ?? "");
  const hasBackendSignal =
    /\b(back\s?end|api|server|node\s?js|express|fastify|nestjs|prisma|orm|database|auth|jwt|graphql|microservice|rest|sql|postgres|mysql|mongodb|redis|websocket)\b/.test(
      metadata,
    ) ||
    ["Java", "Go", "PHP", "Ruby", "C#", "SQL"].includes(
      repository.language ?? "",
    );

  if (
    /\bfull\s?stack\b/.test(metadata) ||
    (hasFrontendSignal && hasBackendSignal)
  ) {
    return "fullstack";
  }

  if (hasFrontendSignal) {
    return "frontend";
  }

  if (hasBackendSignal) {
    return "backend";
  }

  return "other";
}

export function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem(themeStorageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
