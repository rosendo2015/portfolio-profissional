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
import {
  featuredProjectsCount,
  featuredProjectsStorageKey,
  githubUsername,
  projectCategoryLabels,
  projectsPerPage,
  readmeImageCache,
  themeStorageKey,
} from "./constants";
import type {
  GitHubRepository,
  ProjectCategoryFilter,
  ProjectFilter,
  Theme,
} from "./types";
import {
  getInitialTheme,
  getProjectCategory,
  getProjectDescription,
  getSavedFeaturedProjectIds,
  getTechnologyColor,
  loadRepositoryImage,
} from "./utils";

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [featuredProjectIds, setFeaturedProjectIds] = useState<number[]>(() =>
    getSavedFeaturedProjectIds(),
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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#111916" : "#f4f6f2");
  }, [theme]);

  useEffect(() => {
    if (featuredProjectIds.length === featuredProjectsCount) {
      window.localStorage.setItem(
        featuredProjectsStorageKey,
        JSON.stringify(featuredProjectIds),
      );
    }
  }, [featuredProjectIds]);

  function handleContactSubmit(event: React.FormEvent) {
    event.preventDefault();
    const mailtoUrl = `mailto:rosendc30@gmail.com?subject=Contato%20Portf%C3%B3lio%20-%20${encodeURIComponent(contactName)}&body=${encodeURIComponent(
      `Nome: ${contactName}\nEmail: ${contactEmail}\n\nMensagem:\n${contactMessage}`,
    )}`;
    window.location.href = mailtoUrl;
  }

  function handleProjectImageError(repositoryId: number) {
    readmeImageCache.delete(repositoryId);
    setProjectImages((currentImages) => {
      const nextImages = { ...currentImages };
      delete nextImages[repositoryId];
      return nextImages;
    });
  }

  // Tecnologia para tags
  function getTechTagStyle(technology: string) {
    const colorIndex = getTechnologyColor(technology);
    const colors = [
      { border: "#bfdcc8", text: "#285b3d", bg: "#e4f2e8" },
      { border: "#c5d8ef", text: "#31547c", bg: "#e8f0fa" },
      { border: "#f0d3ad", text: "#805222", bg: "#fbf0df" },
      { border: "#edc5c1", text: "#873e39", bg: "#f9e9e7" },
      { border: "#c9d5a5", text: "#566626", bg: "#eef3dd" },
      { border: "#c3deda", text: "#2e625a", bg: "#e4f2ef" },
    ];
    const color = colors[colorIndex];
    return {
      border: `1px solid ${color.border}`,
      color: color.text,
      background: color.bg,
    };
  }

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
          if (
            requestError instanceof Error &&
            requestError.message.includes("403")
          ) {
            setError(requestError.message);
          } else {
            setRepositories([
              {
                id: 1,
                name: "portfolio-profissional",
                description: "Portfólio profissional de Francisco Rosendo",
                homepage: "https://meu-portfolio.com",
                default_branch: "main",
                language: "TypeScript",
                topics: ["portfolio", "react", "vite"],
                stargazers_count: 5,
                fork: false,
              },
              {
                id: 2,
                name: "api-nodejs",
                description: "API REST com Node.js",
                homepage: "https://api.example.com",
                default_branch: "main",
                language: "JavaScript",
                topics: ["api", "nodejs", "express"],
                stargazers_count: 3,
                fork: false,
              },
              {
                id: 3,
                name: "ecommerce-frontend",
                description: "Frontend de ecommerce",
                homepage: "https://loja.example.com",
                default_branch: "main",
                language: "TypeScript",
                topics: ["react", "ecommerce", "vite"],
                stargazers_count: 8,
                fork: false,
              },
              {
                id: 4,
                name: "app-mobile",
                description: "Aplicativo mobile",
                homepage: null,
                default_branch: "main",
                language: "Dart",
                topics: ["flutter", "mobile"],
                stargazers_count: 2,
                fork: false,
              },
            ]);
          }
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
    const controller = new AbortController();
    const allIds = [
      ...featuredProjectIds,
      ...repositories
        .slice(
          (currentPage - 1) * projectsPerPage,
          (currentPage - 1) * projectsPerPage + projectsPerPage,
        )
        .map((repository) => repository.id),
    ];
    const repositoryIds = new Set(allIds);
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
  }, [featuredProjectIds, repositories, currentPage]);

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
      .toLowerCase();

    return (
      matchesFilter &&
      matchesCategory &&
      searchableText.includes(search.toLowerCase())
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
  const canSaveFeaturedProjects =
    draftFeaturedProjectIds.length === featuredProjectsCount &&
    new Set(draftFeaturedProjectIds).size === featuredProjectsCount &&
    draftFeaturedProjectIds.every((id) =>
      repositories.some((repository) => repository.id === id),
    );

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
                Contato
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
            <div className="logo-label">
              <span>@{githubUsername}</span>
            </div>
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
            <span className="metric-value">GitHub</span>
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
                        const initialDraft = [...displayedFeaturedProjectIds];
                        while (initialDraft.length < featuredProjectsCount) {
                          initialDraft.push(0);
                        }
                        setDraftFeaturedProjectIds(
                          initialDraft.slice(0, featuredProjectsCount),
                        );
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
                      <div
                        className="project-thumbnail"
                        role="img"
                        aria-label={`Prévia do projeto ${repository.name}`}
                      >
                        {projectImages[repository.id] ? (
                          <img
                            src={projectImages[repository.id]}
                            alt=""
                            loading="lazy"
                            onError={() =>
                              handleProjectImageError(repository.id)
                            }
                          />
                        ) : (
                          <span aria-hidden="true">
                            {repository.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
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
                              style={getTechTagStyle(technology)}
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
                                const selectedId =
                                  event.target.value === ""
                                    ? 0
                                    : Number(event.target.value);
                                setDraftFeaturedProjectIds((currentIds) =>
                                  currentIds.map((id, currentIndex) =>
                                    currentIndex === index ? selectedId : id,
                                  ),
                                );
                              }}
                            >
                              <option value="" disabled>
                                Selecione um projeto
                              </option>
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
                          <a href="#contato" target="_blank" rel="noreferrer">
                            Contato <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="project-toolbar">
              <fieldset className="filter-group" aria-label="Filtrar projetos">
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
              </fieldset>
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
                    <div
                      className="project-thumbnail"
                      role="img"
                      aria-label={`Prévia do projeto ${repository.name}`}
                    >
                      {projectImages[repository.id] ? (
                        <img
                          src={projectImages[repository.id]}
                          alt=""
                          loading="lazy"
                          onError={() => handleProjectImageError(repository.id)}
                        />
                      ) : (
                        <span aria-hidden="true">
                          {repository.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
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
                            style={getTechTagStyle(technology)}
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
                      <a href="#contato" target="_blank" rel="noreferrer">
                        Contato <span aria-hidden="true">↗</span>
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
              <p className="about-contact-note">
                Interessado nos códigos dos projetos? Entre em contato para mais
                informações.
              </p>
            </div>
          </div>
        </section>

        <section className="container contact-section" id="contato">
          <p className="eyebrow">Próximo passo</p>
          <div className="contact-content">
            <div>
              <h2 className="mb-2">
                Vamos criar algo
                <br />
                que vale a pena
                <span className="accent-period">.</span>
              </h2>
              <p className="contact-description">
                Se você tem interesse em acessar os códigos dos meus projetos ou
                quer discutir uma parceria, preencha o formulário abaixo para
                entrar em contato.
              </p>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-name" className="visually-hidden">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-email" className="visually-hidden">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact-message" className="visually-hidden">
                  Mensagem
                </label>
                <textarea
                  id="contact-message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Mensagem"
                  rows={4}
                  required
                />
              </div>
              <button type="submit" className="button button-primary">
                Enviar
              </button>
            </form>
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
