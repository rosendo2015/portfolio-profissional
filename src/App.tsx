import {
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  Pencil,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./App.css";

type GitHubRepository = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
};

type ProjectFilter = "all" | "deployed";
type ProjectCategory = "frontend" | "backend" | "fullstack" | "other";
type ProjectCategoryFilter = ProjectCategory | "all";
type Theme = "light" | "dark";

const projectsPerPage = 7;
const maxDescriptionLength = 150;
const githubUsername = "rosendo2015";
const githubProfileUrl = `https://github.com/${githubUsername}`;
const themeStorageKey = "francisco-rosendo-theme";
const featuredProjectsStorageKey = "francisco-rosendo-featured-projects";
const featuredProjectsCount = 4;
const projectCategoryLabels: Record<ProjectCategory, string> = {
  frontend: "Front-end",
  backend: "Back-end",
  fullstack: "Fullstack",
  other: "Outros",
};
const readmeImageCache = new Map<number, string | null>();

function getReadmeImageUrl(
  markdown: string,
  repository: GitHubRepository,
): string | undefined {
  const markdownImages = Array.from(
    markdown.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g),
    (match) => match[1] ?? match[2],
  );
  const htmlImages = Array.from(
    markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
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

async function loadRepositoryImage(
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

function getProjectDescription(repository: GitHubRepository): string {
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

function getTechnologyColor(technology: string): number {
  let hash = 0;

  for (const character of technology) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return Math.abs(hash) % 6;
}

function getSavedFeaturedProjectIds(): number[] {
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

type ProjectThumbnailProps = {
  repository: GitHubRepository;
  imageUrl?: string;
  onImageError: (repositoryId: number) => void;
};

function ProjectThumbnail({
  repository,
  imageUrl,
  onImageError,
}: ProjectThumbnailProps) {
  return (
    <div
      className="project-thumbnail"
      role="img"
      aria-label={`Prévia do projeto ${repository.name}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => onImageError(repository.id)}
        />
      ) : (
        <span aria-hidden="true">
          {repository.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function getProjectCategory(repository: GitHubRepository): ProjectCategory {
  const metadata = [
    repository.name,
    repository.description ?? "",
    ...repository.topics,
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR")
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

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem(themeStorageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [featuredProjectIds, setFeaturedProjectIds] = useState<number[]>(
    getSavedFeaturedProjectIds,
  );
  const [draftFeaturedProjectIds, setDraftFeaturedProjectIds] = useState<
    number[]
  >([]);
  const [isEditingFeaturedProjects, setIsEditingFeaturedProjects] =
    useState(false);
  const [projectImages, setProjectImages] = useState<Record<number, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [category, setCategory] = useState<ProjectCategoryFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#111916" : "#f4f6f2");
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRepositories() {
      const allRepositories: GitHubRepository[] = [];
      let nextUrl: string | undefined =
        `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`;

      try {
        while (nextUrl) {
          const response = await fetch(nextUrl, {
            headers: { Accept: "application/vnd.github+json" },
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(
              response.status === 403
                ? "O limite temporário da API do GitHub foi atingido. Tente novamente em alguns minutos."
                : "Não foi possível carregar os projetos do GitHub.",
            );
          }

          const page = (await response.json()) as GitHubRepository[];
          allRepositories.push(
            ...page.filter((repository) => !repository.fork),
          );

          const nextLink = response.headers
            .get("Link")
            ?.split(",")
            .find((link) => link.includes('rel="next"'));

          nextUrl = nextLink?.match(/<([^>]+)>/)?.[1];
        }

        setRepositories(allRepositories);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Ocorreu um erro ao carregar os projetos.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRepositories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (featuredProjectIds.length === featuredProjectsCount) {
      window.localStorage.setItem(
        featuredProjectsStorageKey,
        JSON.stringify(featuredProjectIds),
      );
    }
  }, [featuredProjectIds]);

  const visibleRepositories = repositories.filter((repository) => {
    const matchesFilter = filter === "all" || Boolean(repository.homepage);
    const matchesCategory =
      category === "all" || getProjectCategory(repository) === category;
    const searchableText = [
      repository.name,
      repository.description ?? "",
      repository.language ?? "",
      ...repository.topics,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return (
      matchesFilter &&
      matchesCategory &&
      searchableText.includes(search.toLocaleLowerCase("pt-BR"))
    );
  });
  const totalPages = Math.ceil(visibleRepositories.length / projectsPerPage);
  const firstVisibleIndex = (currentPage - 1) * projectsPerPage;
  const paginatedRepositories = visibleRepositories.slice(
    firstVisibleIndex,
    firstVisibleIndex + projectsPerPage,
  );
  const validFeaturedProjectIds = featuredProjectIds.filter((id) =>
    repositories.some((repository) => repository.id === id),
  );
  const displayedFeaturedProjectIds = [
    ...validFeaturedProjectIds,
    ...repositories
      .filter((repository) => !validFeaturedProjectIds.includes(repository.id))
      .slice(0, featuredProjectsCount - validFeaturedProjectIds.length)
      .map((repository) => repository.id),
  ];
  const featuredRepositories = displayedFeaturedProjectIds
    .map((id) => repositories.find((repository) => repository.id === id))
    .filter((repository): repository is GitHubRepository =>
      Boolean(repository),
    );
  const imageRepositoryIds = Array.from(
    new Set([
      ...displayedFeaturedProjectIds,
      ...paginatedRepositories.map((repository) => repository.id),
    ]),
  ).join(",");
  const canSaveFeaturedProjects =
    draftFeaturedProjectIds.length === featuredProjectsCount &&
    new Set(draftFeaturedProjectIds).size === featuredProjectsCount &&
    draftFeaturedProjectIds.every((id) =>
      repositories.some((repository) => repository.id === id),
    );

  function handleProjectImageError(repositoryId: number) {
    readmeImageCache.delete(repositoryId);
    setProjectImages((currentImages) => {
      const nextImages = { ...currentImages };
      delete nextImages[repositoryId];
      return nextImages;
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    const repositoryIds = new Set(imageRepositoryIds.split(",").map(Number));
    const repositoriesForImages = repositories.filter((repository) =>
      repositoryIds.has(repository.id),
    );

    async function loadProjectImages() {
      const images: Array<[number, string]> = [];

      await Promise.all(
        repositoriesForImages.map(async (repository) => {
          const imageUrl = await loadRepositoryImage(
            repository,
            controller.signal,
          );

          if (imageUrl) {
            images.push([repository.id, imageUrl]);
          }
        }),
      );

      if (!controller.signal.aborted && images.length > 0) {
        setProjectImages((currentImages) => ({
          ...currentImages,
          ...Object.fromEntries(images),
        }));
      }
    }

    void loadProjectImages();
    return () => controller.abort();
  }, [imageRepositoryIds, repositories]);

  const deployedCount = repositories.filter(
    (repository) => repository.homepage,
  ).length;
  const languages = Array.from(
    new Set(
      repositories.map((repository) => repository.language).filter(Boolean),
    ),
  ) as string[];

  return (
    <>
      <header className="site-header">
        <div className="container header-content">
          <a
            className="wordmark"
            href="#inicio"
            aria-label="Francisco Rosendo, início"
          >
            FR<span>.</span>
          </a>
          <div className="header-tools">
            <nav className="main-nav" aria-label="Navegação principal">
              <a href="#projetos">Projetos</a>
              <a href="#sobre">Sobre</a>
              <a className="nav-contact" href="#contato">
                Contato <span aria-hidden="true">↗</span>
              </a>
            </nav>
            <button
              className="theme-toggle"
              type="button"
              aria-label={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`}
              aria-pressed={theme === "dark"}
              title={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`}
              onClick={() =>
                setTheme((currentTheme) =>
                  currentTheme === "light" ? "dark" : "light",
                )
              }
            >
              {theme === "light" ? (
                <Moon size={18} aria-hidden="true" />
              ) : (
                <Sun size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="container hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-mark" /> Desenvolvedor fullstack
            </p>
            <h1>
              Francisco
              <br />
              Rosendo<span className="accent-period">.</span>
            </h1>
            <p className="hero-description">
              Desenvolvedor fullstack criando experiências digitais completas,
              do primeiro componente à lógica que faz tudo funcionar.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#projetos">
                Explorar projetos <span aria-hidden="true">↓</span>
              </a>
              <a
                className="button button-quiet"
                href={githubProfileUrl}
                target="_blank"
                rel="noreferrer"
              >
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="logo-frame" />
            <img
              className="tech-logo"
              src="/fr-tech-logo.svg"
              alt="Logomarca FR de Francisco Rosendo, formada por monograma e trilhas de circuito"
              width="360"
              height="420"
              fetchPriority="high"
            />
            <a
              className="logo-label"
              href={githubProfileUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>@{githubUsername}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="container metrics" aria-label="Resumo do portfólio">
          <div className="metric">
            <span className="metric-value">
              {isLoading ? "..." : repositories.length}
            </span>
            <span className="metric-label">repositórios próprios</span>
          </div>
          <div className="metric">
            <span className="metric-value">
              {isLoading ? "..." : deployedCount}
            </span>
            <span className="metric-label">com site publicado</span>
          </div>
          <div className="metric metric-note">
            <span className="metric-value">
              GitHub <span aria-hidden="true">↗</span>
            </span>
            <span className="metric-label">projetos atualizados do perfil</span>
          </div>
        </section>

        <section className="projects-section" id="projetos">
          <div className="container">
            <div className="section-heading projects-heading">
              <div>
                <p className="eyebrow">
                  Trabalho em andamento e projetos publicados
                </p>
                <h2>
                  Projetos<span className="accent-period">.</span>
                </h2>
              </div>
              <a
                className="text-link"
                href={githubProfileUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ver perfil completo <span aria-hidden="true">↗</span>
              </a>
            </div>

            {!isLoading && !error && featuredRepositories.length > 0 && (
              <section
                className="featured-projects"
                aria-labelledby="featured-projects-title"
              >
                <div className="featured-heading">
                  <div>
                    <p className="eyebrow">Seleção em destaque</p>
                    <h3 id="featured-projects-title">Projetos para conhecer</h3>
                  </div>
                  {isEditingFeaturedProjects ? (
                    <div className="featured-actions">
                      <button
                        className="featured-action-button featured-cancel-button"
                        type="button"
                        onClick={() => setIsEditingFeaturedProjects(false)}
                      >
                        <X size={16} aria-hidden="true" />
                        Cancelar
                      </button>
                      <button
                        className="featured-action-button featured-save-button"
                        type="button"
                        disabled={!canSaveFeaturedProjects}
                        onClick={() => {
                          setFeaturedProjectIds(draftFeaturedProjectIds);
                          setIsEditingFeaturedProjects(false);
                        }}
                      >
                        <Check size={16} aria-hidden="true" />
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="featured-action-button"
                      type="button"
                      onClick={() => {
                        setDraftFeaturedProjectIds(displayedFeaturedProjectIds);
                        setIsEditingFeaturedProjects(true);
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Editar destaques
                    </button>
                  )}
                </div>

                <div className="featured-grid">
                  {featuredRepositories.map((repository, index) => (
                    <article className="featured-card" key={repository.id}>
                      <ProjectThumbnail
                        repository={repository}
                        imageUrl={projectImages[repository.id]}
                        onImageError={handleProjectImageError}
                      />
                      <div className="featured-card-content">
                        <p className="featured-card-category">
                          {
                            projectCategoryLabels[
                              getProjectCategory(repository)
                            ]
                          }
                        </p>
                        <h4>{repository.name.replace(/[-_]/g, " ")}</h4>
                        <p className="featured-card-description">
                          {getProjectDescription(repository)}
                        </p>
                        <div className="project-tags">
                          {Array.from(
                            new Set([
                              ...(repository.language
                                ? [repository.language]
                                : []),
                              ...repository.topics,
                            ]),
                          ).map((technology) => (
                            <span
                              className="technology-tag"
                              data-color={getTechnologyColor(technology)}
                              key={technology}
                            >
                              {technology}
                            </span>
                          ))}
                        </div>
                        {isEditingFeaturedProjects && (
                          <label className="featured-project-select">
                            <span>Projeto {index + 1}</span>
                            <select
                              value={draftFeaturedProjectIds[index] ?? ""}
                              onChange={(event) => {
                                const selectedId = Number(event.target.value);
                                setDraftFeaturedProjectIds((currentIds) =>
                                  currentIds.map((id, currentIndex) =>
                                    currentIndex === index ? selectedId : id,
                                  ),
                                );
                              }}
                            >
                              {repositories.map((option) => (
                                <option
                                  key={option.id}
                                  value={option.id}
                                  disabled={draftFeaturedProjectIds.some(
                                    (id, currentIndex) =>
                                      currentIndex !== index &&
                                      id === option.id,
                                  )}
                                >
                                  {option.name.replace(/[-_]/g, " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <div className="featured-card-links">
                          {repository.homepage && (
                            <a
                              href={repository.homepage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Site <span aria-hidden="true">↗</span>
                            </a>
                          )}
                          <a
                            href={repository.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Código <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="project-toolbar">
              <div
                className="filter-group"
                role="group"
                aria-label="Filtrar projetos"
              >
                <button
                  className={
                    filter === "all" ? "filter-button active" : "filter-button"
                  }
                  type="button"
                  aria-pressed={filter === "all"}
                  onClick={() => {
                    setFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  Todos
                </button>
                <button
                  className={
                    filter === "deployed"
                      ? "filter-button active"
                      : "filter-button"
                  }
                  type="button"
                  aria-pressed={filter === "deployed"}
                  onClick={() => {
                    setFilter("deployed");
                    setCurrentPage(1);
                  }}
                >
                  Com site
                </button>
              </div>
              <label className="category-select">
                <span className="visually-hidden">Categoria dos projetos</span>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as ProjectCategoryFilter);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Todas as categorias</option>
                  <option value="frontend">Front-end</option>
                  <option value="backend">Back-end</option>
                  <option value="fullstack">Fullstack</option>
                  <option value="other">Outros</option>
                </select>
              </label>
              <label className="search-field">
                <span className="visually-hidden">Buscar projetos</span>
                <span className="search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar projeto ou tecnologia"
                />
              </label>
            </div>

            <div className="project-list" aria-live="polite">
              {isLoading && (
                <p className="project-message">
                  Carregando projetos do GitHub...
                </p>
              )}
              {!isLoading && error && (
                <p className="project-message" role="alert">
                  {error}
                </p>
              )}
              {!isLoading && !error && visibleRepositories.length === 0 && (
                <p className="project-message">
                  {repositories.length === 0
                    ? "Nenhum repositório público próprio encontrado."
                    : "Nenhum projeto corresponde à busca."}
                </p>
              )}
              {!isLoading &&
                !error &&
                paginatedRepositories.map((repository) => (
                  <article className="project-row" key={repository.id}>
                    <ProjectThumbnail
                      repository={repository}
                      imageUrl={projectImages[repository.id]}
                      onImageError={handleProjectImageError}
                    />
                    <div className="project-summary">
                      <h3>{repository.name.replace(/[-_]/g, " ")}</h3>
                      <p>{getProjectDescription(repository)}</p>
                      <div className="project-tags">
                        <span
                          className={`project-category-tag category-${getProjectCategory(repository)}`}
                        >
                          {
                            projectCategoryLabels[
                              getProjectCategory(repository)
                            ]
                          }
                        </span>
                        {Array.from(
                          new Set([
                            ...(repository.language
                              ? [repository.language]
                              : []),
                            ...repository.topics,
                          ]),
                        ).map((technology) => (
                          <span
                            className="technology-tag"
                            data-color={getTechnologyColor(technology)}
                            key={technology}
                          >
                            {technology}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="project-stars">
                      {repository.stargazers_count > 0 && (
                        <>{repository.stargazers_count} estrelas</>
                      )}
                    </span>
                    <div className="project-links">
                      {repository.homepage && (
                        <a
                          href={repository.homepage}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Site <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      <a
                        href={repository.html_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Código <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </article>
                ))}
            </div>

            {!isLoading && !error && totalPages > 1 && (
              <nav className="pagination" aria-label="Paginação de projetos">
                <p className="pagination-summary" aria-live="polite">
                  {`Exibindo projetos ${firstVisibleIndex + 1} a ${Math.min(
                    firstVisibleIndex + projectsPerPage,
                    visibleRepositories.length,
                  )} de ${visibleRepositories.length}`}
                </p>
                <div className="pagination-controls">
                  <button
                    className="pagination-button"
                    type="button"
                    aria-label="Página anterior"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <span className="pagination-page" aria-live="polite">
                    Página <strong>{currentPage}</strong> de {totalPages}
                  </span>
                  <button
                    className="pagination-button"
                    type="button"
                    aria-label="Próxima página"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}

            {!isLoading && !error && repositories.length > 0 && (
              <p className="project-footnote">
                {repositories.length} repositórios públicos próprios
                {languages.length > 0 && (
                  <> · {languages.slice(0, 6).join(" · ")}</>
                )}
              </p>
            )}
          </div>
        </section>

        <section className="about-section" id="sobre">
          <div className="container about-content">
            <div className="about-title">
              <p className="eyebrow">Sobre mim</p>
              <h2>
                Do front ao back,
                <br />
                com propósito<span>.</span>
              </h2>
            </div>
            <div className="about-copy">
              <p>
                Sou Francisco Rosendo, desenvolvedor fullstack. Gosto de
                transformar ideias em produtos digitais que sejam claros para
                quem usa e sólidos por dentro.
              </p>
              <a
                className="about-link"
                href={githubProfileUrl}
                target="_blank"
                rel="noreferrer"
              >
                Conheça meu trabalho no GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <section className="container contact-section" id="contato">
          <p className="eyebrow">Próximo passo</p>
          <div className="contact-content">
            <h2>
              Vamos criar algo
              <br />
              que vale a pena.
            </h2>
            <a
              className="button button-primary"
              href={githubProfileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Fale comigo pelo GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-content">
          <span>
            Francisco Rosendo <span className="accent-period">.</span>
          </span>
          <span>Desenvolvedor fullstack</span>
          <a href="#inicio">Voltar ao topo ↑</a>
        </div>
      </footer>
    </>
  );
}

export default App;
