/* ============================================================
   MD Viewer — site interactions
   ============================================================ */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ----------------------------------------------------------
     i18n — EN defaults live in the HTML; PT lives here.
     On first run we snapshot the EN text so we can restore it.
  ---------------------------------------------------------- */
  const I18N = {
    pt: {
      "nav.features": "Recursos", "nav.download": "Download", "nav.usage": "Uso", "nav.tech": "Tecnologia",
      "hero.version": "Última versão",
      "hero.badgeSize": "~2 MB · Grátis e open source",
      "hero.sub": "Um visualizador de Markdown leve, somente leitura, para Windows, macOS e Linux. Renderização GFM completa, syntax highlighting e desempenho nativo — num instalador de ~2 MB.",
      "hero.downloadBtn": "Baixar grátis", "hero.sourceBtn": "Ver código",
      "hero.p1": "Somente leitura — sem edição, sem distração",
      "hero.p2": "Windows, macOS e Linux",
      "hero.p3": "Temas claro e escuro",
      "mock.view": "render", "mock.hint": "Experimente: alternar renderização →",
      "stat.lines": "linhas para arquivos grandes", "stat.winSize": "instalador no Windows",
      "stat.platforms": "plataformas", "stat.langs": "linguagens com destaque",
      "features.kicker": "Recursos",
      "features.title": "Tudo que você precisa para <span class=\"grad\">ler</span>, nada do que não precisa",
      "features.sub": "Feito para leitura primeiro — abre rápido, agradável de rolar, não atrapalha.",
      "f1.t": "Renderização GFM completa",
      "f1.d": "Títulos, tabelas, listas de tarefas, blocos de código, citações, imagens e vídeos — renderizados exatamente como devem ser.",
      "f2.t": "Syntax highlighting",
      "f2.d": "JavaScript, TypeScript, Python, Rust, Go, Bash, SQL, CSS, HTML/XML e JSON, nativamente.",
      "f3.t": "Temas claro e escuro",
      "f3.d": "Detecta automaticamente a preferência do sistema e permite alternar quando quiser na barra de ferramentas.",
      "f4.t": "Abra do jeito que preferir",
      "f4.d": "Ctrl+O, arrastar e soltar na janela, associação de arquivos (duplo clique) ou clique direito → “Abrir com MD Viewer”.",
      "f5.t": "Caminhos relativos que funcionam",
      "f5.d": "Imagens e links relativos ao arquivo .md são resolvidos automaticamente — screenshots e assets aparecem na hora.",
      "f6.t": "Zoom e pan, memorizados",
      "f6.d": "Ctrl+scroll de 80% a 200%, Ctrl+arrastar para navegar. Seu nível de zoom fica salvo entre sessões.",
      "f7.t": "Leve como uma pluma",
      "f7.d": "Instalador de ~2 MB no Windows. Abre instantaneamente e fica quase invisível.",
      "f8.t": "Verdadeiramente nativo",
      "f8.d": "Construído sobre Tauri 2: WebView2 no Windows, WebKit nativo no macOS e Linux. Sem o inchaço do Electron.",
      "dl.kicker": "Download", "dl.title2": "Escolha sua plataforma",
      "dl.sub": "Baixe o instalador mais recente na", "dl.pages": "página",
      "dl.recommended": "recomendado",
      "dl.winNote": "Associação de arquivos e menu de contexto são registrados automaticamente.",
      "dl.macNote": "Monte o .dmg e arraste o MD Viewer para Applications.",
      "dl.linuxNote": "chmod +x no AppImage e execute, ou sudo dpkg -i no .deb.",
      "dl.oneliner": "Instalação de uma linha", "dl.pwshTab": "PowerShell", "dl.bashTab": "Bash",
      "copy": "Copiar",
      "usage.kicker": "Uso", "usage.title2": "Teclado primeiro, mouse amigável",
      "usage.actions": "Ações", "usage.zoom": "Zoom e pan",
      "u1.a": "Abrir um arquivo", "u2.a": "Alternar tema", "u2.k": "botão na barra",
      "u3.a": "Abrir do terminal", "u4.a": "Definir como padrão", "u4.k": "clique direito → abrir com",
      "u5.a": "Aumentar / diminuir zoom", "u6.a": "Redefinir para 100%", "u7.a": "Navegar a página", "u8.a": "Faixa",
      "tech.kicker": "Tecnologia", "tech.title2": "Construído como uma pena",
      "tech.sub": "Rust onde importa, tecnologia web onde brilha. O shell do Tauri v2 mantém o pacote minúsculo e o consumo de memória baixo.",
      "s1.d": "casca do app", "s2.d": "núcleo + bundling", "s3.d": "renderer", "s4.d": "ferramenta de build", "s5.d": "webview nativa",
      "tech.build": "Compilar do código-fonte",
      "tech.req": "Pré-requisitos:",
      "tech.reqTxt": "Node.js 20+, Rust 1.77+, dependências do Tauri v2. Os artefatos ficam em src-tauri/target/release/bundle/.",
      "cta.title": "Seus arquivos .md merecem um leitor.",
      "cta.sub": "Grátis, open source e ~2 MB. O que você está esperando?",
      "cta.btn": "Baixar o MD Viewer",
      "footer.made": "Feito com", "footer.open": "Código aberto", "footer.releases": "Versões", "footer.issues": "Issues"
    }
  };

  /* snapshot EN originals once, so we can switch back */
  $$("[data-i18n],[data-i18n-html]").forEach(el => {
    if (!el.dataset.orig) el.dataset.orig = el.dataset.i18nHtml ? el.innerHTML : el.textContent;
  });

  const versionContent = { tag: null };
  let lang = (localStorage.getItem("mdv-lang") === "pt" || localStorage.getItem("mdv-lang") === "en")
    ? localStorage.getItem("mdv-lang")
    : (/pt/i.test(navigator.language) ? "pt" : "en");

  const versionText = () => versionContent.tag || (lang === "pt" ? I18N.pt["hero.version"] : "Latest release");

  const applyLang = () => {
    const isPT = lang === "pt";
    $$("[data-i18n]").forEach(el => {
      const v = I18N.pt[el.dataset.i18n];
      el.textContent = isPT && v !== undefined ? v : el.dataset.orig;
    });
    $$("[data-i18n-html]").forEach(el => {
      const v = I18N.pt[el.dataset.i18nHtml];
      el.innerHTML = isPT && v !== undefined ? v : el.dataset.orig;
    });
    // version badge text comes from the API (if fetched) or the dictionary
    const ver = $("#release-version");
    if (ver) ver.textContent = versionText();

    document.documentElement.lang = isPT ? "pt-BR" : "en";
    const lt = $("#lang-toggle");
    lt.classList.toggle("en", lang === "en");
    $$("#lang-toggle [data-lang]").forEach(s => s.classList.toggle("is-on", s.dataset.lang === lang));
  };

  /* ----------------------------------------------------------
     theme — auto/light/dark, persisted
  ---------------------------------------------------------- */
  const html = document.documentElement;
  const sys = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const forced = new URLSearchParams(location.search).get("theme");
  html.dataset.theme = forced === "light" || forced === "dark" ? forced : (localStorage.getItem("mdv-theme") || sys);

  let toastT;
  const toast = msg => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-show"), 2200);
  };

  $("#theme-toggle").addEventListener("click", () => {
    html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("mdv-theme", html.dataset.theme);
    toast(html.dataset.theme === "light"
      ? (lang === "pt" ? "Tema: claro ☀️" : "Theme: light ☀️")
      : (lang === "pt" ? "Tema: escuro 🌙" : "Theme: dark 🌙"));
  });

  $("#lang-toggle").addEventListener("click", () => {
    lang = lang === "en" ? "pt" : "en";
    localStorage.setItem("mdv-lang", lang);
    applyLang();
    updateMockLabel();
    toast(lang === "pt" ? "Idioma: Português (BR)" : "Language: English");
  });
  // deep-link: ?lang=pt|en força o idioma (e persiste)
  const forcedLang = new URLSearchParams(location.search).get("lang");
  if (forcedLang === "pt" || forcedLang === "en") { lang = forcedLang; localStorage.setItem("mdv-lang", lang); }

  /* ----------------------------------------------------------
     nav — scrolled state, mobile menu, scroll-spy
  ---------------------------------------------------------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 8), { passive: true });

  const menuBtn = $("#menu-btn"), mobileMenu = $("#mobile-menu");
  menuBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", mobileMenu).forEach(a => a.addEventListener("click", () => {
    mobileMenu.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  const navLinks = $$("#nav-links a");
  const sections = $$("main section[id]");
  addEventListener("scroll", () => {
    let cur = "";
    sections.forEach(s => { if (scrollY >= s.offsetTop - 140) cur = s.id; });
    navLinks.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === `#${cur}`));
  }, { passive: true });

  /* ----------------------------------------------------------
     mock viewer — source <-> render toggle
  ---------------------------------------------------------- */
  const mock = $("#mock");
  const mockToggle = $("#mock-toggle");
  const srcView = $("#mock-src"), renderView = $("#mock-render");
  let rendered = false;
  const updateMockLabel = () => {
    mockToggle.textContent = rendered ? (lang === "pt" ? "origem" : "source") : "render";
  };
  const swap = () => {
    rendered = !rendered;
    mock.classList.remove("is-swapping");
    void mock.offsetWidth; // restart CSS animation
    mock.classList.add("is-swapping");
    setTimeout(() => {
      srcView.hidden = rendered;
      renderView.hidden = !rendered;
      updateMockLabel();
    }, 140);
    $("#mock-hint").classList.add("is-hidden");
  };
  mockToggle.addEventListener("click", () => swap());
  setTimeout(() => $("#mock-hint").classList.remove("is-hidden"), 1500);

  /* ----------------------------------------------------------
     GitHub API — latest release version (graceful fallback)
  ---------------------------------------------------------- */
  (async () => {
    try {
      const r = await fetch("https://api.github.com/repos/RicSchonfelder/MD-Viewer/releases/latest", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (j.tag_name) {
        versionContent.tag = j.tag_name;
        $("#release-version").textContent = versionText();
      }
    } catch (_) { /* offline — keep default text */ }
  })();

  /* ----------------------------------------------------------
     OS detection — spotlight the visitor's platform card
  ---------------------------------------------------------- */
  (() => {
    const ua = navigator.userAgent;
    let id = null;
    if (/Win/.test(ua)) id = "dl-windows";
    else if (/Mac|iPhone|iPad/.test(ua)) id = "dl-macos";
    else if (/Linux|X11|Android/.test(ua)) id = "dl-linux";
    if (!id) return;
    const card = document.getElementById(id);
    if (card) card.classList.add("is-your-os");
  })();

  /* ----------------------------------------------------------
     codebox tabs + copy buttons
  ---------------------------------------------------------- */
  const CMDS = {
    pwsh: "irm https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.ps1 | iex",
    bash: "curl -fsSL https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.sh | bash"
  };
  $$(".codebox__tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".codebox__tab").forEach(t => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    $("#one-liner").textContent = CMDS[tab.dataset.cmd];
  }));

  const doCopy = async (btn, text) => {
    const copiedMsg = lang === "pt" ? "Copiado!" : "Copied!";
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
    }
    btn.classList.add("is-copied");
    const label = btn.querySelector("span");
    const prev = label.textContent;
    label.textContent = copiedMsg;
    toast(copiedMsg);
    setTimeout(() => { btn.classList.remove("is-copied"); label.textContent = prev; }, 1800);
  };
  $("#copy-cmd").addEventListener("click", () => doCopy($("#copy-cmd"), $("#one-liner").textContent));
  $("#copy-build").addEventListener("click", () => doCopy($("#copy-build"), $("#build-cmd").textContent));

  /* ----------------------------------------------------------
     reveal on scroll (+ stagger inside grids)
  ---------------------------------------------------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: .12 });
  $$(".reveal").forEach(el => io.observe(el));

  $$(".features, .cards, .stats, .stack").forEach(grid => {
    [...grid.children].forEach((child, i) => (child.style.transitionDelay = `${i * 60}ms`));
  });

  /* ----------------------------------------------------------
     card spotlight (pointer-follow glow)
  ---------------------------------------------------------- */
  $$(".card").forEach(card => card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }));

  /* ----------------------------------------------------------
     animated counters
  ---------------------------------------------------------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const n = e.target, target = +n.dataset.count, suffix = n.dataset.suffix || "";
      const t0 = performance.now(), dur = 1100;
      const step = t => {
        const p = Math.min((t - t0) / dur, 1);
        n.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .5 });
  $$(".stat__n").forEach(el => countIO.observe(el));

  /* ----------------------------------------------------------
     init
  ---------------------------------------------------------- */
  updateMockLabel();
  applyLang();
})();
