/* Outipro — application : navigation, pages, moteur de rendu des outils */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;
  const app = document.getElementById('app');

  /* ====================== Thème ====================== */
  const THEME_KEY = 'outipro-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerHTML = t === 'dark' ? I.sun : I.moon;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
  applyTheme(savedTheme);

  /* ====================== En-tête / pied ====================== */
  function renderChrome() {
    const header = document.getElementById('site-header');
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="#/" aria-label="Outipro, accueil">
          <span class="brand-mark">${I.logo}</span>
          <span>Outi<b>pro</b></span>
        </a>
        <nav class="nav" id="main-nav">
          <a href="#/" data-nav="home">Accueil</a>
          <a href="#/outils" data-nav="tools">Tous les outils</a>
          <a href="#/faq" data-nav="faq">FAQ</a>
          <a href="#/a-propos" data-nav="about">À propos</a>
        </nav>
        <div class="header-actions">
          <button class="icon-btn" id="theme-btn" title="Changer de thème" aria-label="Changer de thème">${I.moon}</button>
          <button class="icon-btn menu-toggle" id="menu-btn" aria-label="Menu">${I.menu}</button>
          <a class="btn btn-primary btn-sm" href="#/outils" style="margin-left:4px">Tous les outils</a>
        </div>
      </div>`;
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    document.getElementById('theme-btn').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
    const nav = document.getElementById('main-nav');
    document.getElementById('menu-btn').addEventListener('click', () => nav.classList.toggle('open'));
    nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') nav.classList.remove('open'); });

    const footer = document.getElementById('site-footer');
    const popular = O.tools.slice(0, 5).map((t) => `<a href="#/outil/${t.slug}">${t.name}</a>`).join('');
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="#/" style="margin-bottom:12px"><span class="brand-mark">${I.logo}</span><span>Outi<b>pro</b></span></a>
            <p>Outipro réunit vos outils PDF et numériques essentiels dans une interface simple, rapide et gratuite. Vos fichiers restent sur votre appareil.</p>
            <div class="badge" style="margin-top:6px">${I.shield} 100 % local</div>
          </div>
          <div class="footer-col">
            <h5>Outils populaires</h5>
            ${popular}
          </div>
          <div class="footer-col">
            <h5>Ressources</h5>
            <a href="#/outils">Tous les outils</a>
            <a href="#/faq">Questions fréquentes</a>
            <a href="#/confidentialite">Confidentialité</a>
            <a href="#/a-propos">À propos</a>
          </div>
          <div class="footer-col">
            <h5>Bon à savoir</h5>
            <a href="#/faq">Aucun envoi de fichier</a>
            <a href="#/faq">Sans inscription</a>
            <a href="#/faq">Sans limite d’usage</a>
            <a href="https://github.com/LUCKSON-NGOY/Outipro" target="_blank" rel="noopener">Code source</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Outipro — Outils gratuits, traitement local.</span>
          <span>Fait avec soin ${I.heart}</span>
        </div>
      </div>`;
  }

  /* ====================== Cartes d'outils ====================== */
  function toolCard(t) {
    return `
      <a class="tool-card" href="#/outil/${t.slug}">
        <div class="tool-ico ${t.color || ''}">${I[t.icon] || I.filePdf}</div>
        <div>
          <h3>${t.name}</h3>
          <p>${t.short}</p>
        </div>
        <span class="arrow">Ouvrir l’outil ${I.arrowRight}</span>
      </a>`;
  }

  /* ====================== Accueil ====================== */
  function pageHome() {
    const featured = O.tools.slice(0, 8);
    const rest = O.tools.slice(8);
    return `
      <section class="hero">
        <div class="container hero-inner">
          <div class="pill"><span class="dot">${I.check}</span> Aucun fichier envoyé sur un serveur</div>
          <h1>Vos outils PDF,<br><span class="grad">simples et gratuits.</span></h1>
          <p class="lead">Fusionnez, divisez, compressez, convertissez et signez vos documents en quelques secondes. Tout est traité directement dans votre navigateur.</p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href="#/outils">Découvrir les outils ${I.arrowRight}</a>
            <a class="btn btn-lg" href="#/outil/fusionner-pdf">${I.merge} Fusionner un PDF</a>
          </div>
          <div class="hero-stats">
            <div class="stat"><b>${O.tools.length}</b><span>outils disponibles</span></div>
            <div class="stat"><b>0 €</b><span>pour toujours</span></div>
            <div class="stat"><b>100 %</b><span>traitement local</span></div>
            <div class="stat"><b>0</b><span>inscription requise</span></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>Les outils les plus utilisés</h2>
              <p>Une sélection pour vos tâches PDF du quotidien.</p>
            </div>
            <a class="btn btn-sm" href="#/outils">Voir les ${O.tools.length} outils ${I.chevronRight}</a>
          </div>
          <div class="tool-grid">${featured.map(toolCard).join('')}</div>
        </div>
      </section>

      <section class="section" style="padding-top:0">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>Conçu pour aller vite</h2>
              <p>Pas de compte, pas d’attente, pas de mauvaise surprise.</p>
            </div>
          </div>
          <div class="feature-strip">
            <div class="feature"><div class="fi">${I.lock}</div><div><h4>Confidentiel par défaut</h4><p>Vos documents ne quittent jamais votre appareil. Aucun téléversement.</p></div></div>
            <div class="feature"><div class="fi">${I.zap}</div><div><h4>Instantané</h4><p>Le traitement s’effectue localement, sans file d’attente ni limite de débit.</p></div></div>
            <div class="feature"><div class="fi">${I.globe}</div><div><h4>Fonctionne partout</h4><p>Ordinateur, tablette ou mobile : un navigateur moderne suffit.</p></div></div>
            <div class="feature"><div class="fi">${I.heart}</div><div><h4>Gratuit et ouvert</h4><p>Aucun abonnement, aucune publicité intrusive, code source public.</p></div></div>
          </div>
        </div>
      </section>

      ${rest.length ? `
      <section class="section" style="padding-top:0">
        <div class="container">
          <div class="section-head"><div><h2>Et aussi</h2><p>Conversion, images et retouches rapides.</p></div></div>
          <div class="tool-grid">${rest.map(toolCard).join('')}</div>
        </div>
      </section>` : ''}

      <section class="section" style="padding-top:0">
        <div class="container">
          <div class="panel" style="display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--grad-soft);border-color:var(--brand-200)">
            <div style="max-width:620px">
              <h2 style="margin-bottom:6px">Besoin d’un outil qui n’existe pas encore ?</h2>
              <p class="muted" style="margin:0">Dites-nous ce qui vous manque : Outipro évolue en fonction des usages réels.</p>
            </div>
            <a class="btn btn-primary" href="https://github.com/LUCKSON-NGOY/Outipro/issues/new" target="_blank" rel="noopener">Proposer une idée ${I.arrowRight}</a>
          </div>
        </div>
      </section>`;
  }

  /* ====================== Tous les outils ====================== */
  function pageTools() {
    const cats = [...new Set(O.tools.map((t) => t.cat))];
    return `
      <section class="tool-page">
        <div class="container">
          <div class="breadcrumb"><a href="#/">Accueil</a> ${I.chevronRight} <span>Tous les outils</span></div>
          <div class="tool-head">
            <div class="tool-ico">${I.layers}</div>
            <div>
              <h1>Tous les outils Outipro</h1>
              <p>${O.tools.length} outils gratuits pour vos PDF, vos images et vos conversions. Choisissez celui dont vous avez besoin.</p>
            </div>
          </div>
          ${cats.map((cat) => `
            <div class="section-head" style="margin-top:28px"><div><h2 style="font-size:1.2rem">${cat}</h2></div></div>
            <div class="tool-grid">${O.tools.filter((t) => t.cat === cat).map(toolCard).join('')}</div>
          `).join('')}
        </div>
      </section>`;
  }

  /* ====================== Page outil ====================== */
  function pageTool(tool) {
    return `
      <section class="tool-page">
        <div class="container">
          <div class="breadcrumb">
            <a href="#/">Accueil</a> ${I.chevronRight}
            <a href="#/outils">Outils</a> ${I.chevronRight}
            <span>${tool.name}</span>
          </div>
          <div class="tool-head">
            <div class="tool-ico ${tool.color || ''}">${I[tool.icon] || I.filePdf}</div>
            <div>
              <h1>${tool.name}</h1>
              <p>${tool.desc}</p>
            </div>
          </div>

          <div class="workspace">
            <div>
              <div class="panel">
                <div class="dropzone" id="dz">
                  <div class="dz-ico">${I.upload}</div>
                  <h3>${tool.dropTitle || 'Déposez votre fichier ici'}</h3>
                  <p>${tool.dropSub || 'ou cliquez pour parcourir vos fichiers'}</p>
                  <div class="dz-hint">${tool.hint || 'PDF · traitement local, aucun envoi'}</div>
                </div>
                <div class="file-list hidden" id="file-list"></div>
                <div id="extra"></div>
              </div>

              <div class="panel" id="options-panel">
                <h2>Options</h2>
                ${tool.fields || '<p class="small muted" style="margin:0">Aucune option nécessaire : lancez le traitement directement.</p>'}
              </div>
            </div>

            <div>
              <div class="panel action-card">
                <h2 style="font-size:.95rem">Lancer le traitement</h2>
                <button class="btn btn-primary btn-lg" id="run-btn">${I[tool.icon] || I.zap} ${tool.action || 'Traiter'}</button>
                <div class="progress" id="prog"><i></i></div>
                <div class="progress-label" id="prog-label"></div>
                <div class="result" id="result"></div>
                <div id="error"></div>
                <p class="note">${I.shield}<span>Vos fichiers sont traités dans votre navigateur. Rien n’est téléversé, rien n’est conservé.</span></p>
              </div>
              <div class="panel">
                <h2 style="font-size:.95rem">Comment ça marche</h2>
                <ol class="steps">
                  <li><span><b>Ajoutez</b> votre fichier via le glisser-déposer.</span></li>
                  <li><span><b>Réglez</b> les options si nécessaire.</span></li>
                  <li><span><b>Téléchargez</b> le résultat en un clic.</span></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* ====================== Pages statiques ====================== */
  function pageFaq() {
    const items = [
      ['Mes fichiers sont-ils envoyés sur un serveur ?', 'Non. Outipro fonctionne entièrement dans votre navigateur grâce à des technologies comme WebAssembly et Canvas. Aucun document n’est téléversé, stocké ou analysé sur un serveur.'],
      ['Est-ce vraiment gratuit ?', 'Oui. Tous les outils sont gratuits et sans limite d’utilisation. Le projet est ouvert et le code source est publié sur GitHub.'],
      ['Dois-je créer un compte ?', 'Aucun compte n’est nécessaire. Vous ouvrez un outil, vous déposez votre fichier, vous téléchargez le résultat.'],
      ['Y a-t-il une limite de taille ?', 'La limite dépend de la mémoire de votre appareil. En pratique, des fichiers de plusieurs centaines de mégaoctets passent sans problème sur un ordinateur récent.'],
      ['Pourquoi mon PDF protégé par mot de passe est-il refusé ?', 'Les outils ne peuvent pas déverrouiller un PDF chiffré. Retirez d’abord la protection dans votre lecteur PDF, puis revenez sur Outipro.'],
      ['La compression dégrade-t-elle la qualité ?', 'La compression convertit les pages en images JPEG. Le texte n’est alors plus sélectionnable. Choisissez une qualité élevée pour préserver la lisibilité.'],
      ['Puis-je utiliser Outipro sur mobile ?', 'Oui, l’interface est responsive. Pour de gros fichiers, un ordinateur reste plus confortable.'],
      ['Les outils fonctionnent-ils hors ligne ?', 'Une fois la page chargée, le traitement est local. Un hébergement statique permet même de l’utiliser en intranet.']
    ];
    return `
      <section class="tool-page">
        <div class="container">
          <div class="breadcrumb"><a href="#/">Accueil</a> ${I.chevronRight} <span>FAQ</span></div>
          <div class="tool-head"><div class="tool-ico c-sky">${I.info}</div><div><h1>Questions fréquentes</h1><p>Tout ce qu’il faut savoir sur Outipro et le traitement de vos fichiers.</p></div></div>
          <div class="faq">${items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
        </div>
      </section>`;
  }

  function pageAbout() {
    return `
      <section class="tool-page">
        <div class="container">
          <div class="breadcrumb"><a href="#/">Accueil</a> ${I.chevronRight} <span>À propos</span></div>
          <div class="tool-head"><div class="tool-ico c-violet">${I.sparkles}</div><div><h1>À propos d’Outipro</h1><p>Des outils numériques utiles, sans friction ni contrepartie.</p></div></div>
          <div class="prose">
            <p>Outipro est né d’un constat simple : accomplir une tâche basique sur un PDF — fusionner deux fichiers, retirer une page, ajouter un filigrane — implique trop souvent de créer un compte, d’accepter des cookies et de confier des documents parfois sensibles à un serveur inconnu.</p>
            <p>Nous avons donc construit une plateforme qui fait l’inverse. Chaque outil s’exécute localement, dans le navigateur, à l’aide de bibliothèques open source éprouvées. Aucun fichier n’est transmis. Aucun compte n’est requis. Aucune limite artificielle n’est imposée.</p>
            <h2>Nos principes</h2>
            <ul>
              <li><strong>Confidentialité structurelle</strong> — l’architecture rend l’envoi de fichiers techniquement impossible.</li>
              <li><strong>Simplicité</strong> — trois étapes, une interface lisible, pas de jargon.</li>
              <li><strong>Gratuité durable</strong> — un site statique léger, sans coût serveur prohibitif.</li>
              <li><strong>Transparence</strong> — le code est public et auditable.</li>
            </ul>
            <h2>Technologies</h2>
            <p>Outipro s’appuie sur pdf-lib pour la manipulation des documents, PDF.js pour le rendu et l’extraction, jsPDF pour la génération, JSZip pour les archives et Mammoth pour la conversion Word. L’ensemble est servi sous forme de fichiers statiques.</p>
            <h2>Contribuer</h2>
            <p>Le projet est ouvert aux suggestions et aux contributions. Signalez un bug, proposez un outil ou améliorez la documentation depuis le dépôt GitHub.</p>
          </div>
        </div>
      </section>`;
  }

  function pagePrivacy() {
    return `
      <section class="tool-page">
        <div class="container">
          <div class="breadcrumb"><a href="#/">Accueil</a> ${I.chevronRight} <span>Confidentialité</span></div>
          <div class="tool-head"><div class="tool-ico c-teal">${I.shield}</div><div><h1>Politique de confidentialité</h1><p>Ce que nous ne collectons pas, et pourquoi c’est important.</p></div></div>
          <div class="prose">
            <h2>Aucun fichier transmis</h2>
            <p>Tous les traitements sont effectués par votre navigateur. Vos documents ne sont jamais envoyés à Outipro ni à un tiers. Fermer l’onglet efface le document de la mémoire de la page.</p>
            <h2>Aucun compte, aucun profilage</h2>
            <p>Outipro ne demande ni adresse e-mail, ni identifiant. Aucun profil utilisateur n’est constitué et aucune donnée n’est revendue.</p>
            <h2>Stockage local</h2>
            <p>Une seule préférence est enregistrée dans votre navigateur : le thème clair ou sombre. Elle reste sur votre appareil et peut être supprimée à tout moment via les réglages du navigateur.</p>
            <h2>Mesure d’audience</h2>
            <p>Aucun traceur publicitaire n’est intégré. Si une mesure d’audience anonyme venait à être ajoutée, elle serait documentée ici et n’identifierait pas les personnes.</p>
            <h2>Vos droits</h2>
            <p>Puisque nous ne détenons aucune donnée personnelle vous concernant, il n’y a rien à supprimer ni à exporter de notre côté. Pour toute question, ouvrez une discussion sur le dépôt GitHub.</p>
          </div>
        </div>
      </section>`;
  }

  function page404() {
    return `
      <section class="tool-page">
        <div class="container center" style="padding:60px 0">
          <div class="tool-ico" style="margin:0 auto 18px;width:64px;height:64px">${I.alert}</div>
          <h1>Page introuvable</h1>
          <p class="muted">Le lien que vous avez suivi n’existe pas ou a été déplacé.</p>
          <a class="btn btn-primary mt-2" href="#/outils">Voir tous les outils</a>
        </div>
      </section>`;
  }

  /* ====================== Moteur d'outil ====================== */
  function mountTool(tool) {
    const files = [];
    const dz = O.$('#dz');
    const listEl = O.$('#file-list');
    const resultEl = O.$('#result');
    const errorEl = O.$('#error');
    const btn = O.$('#run-btn');
    const prog = O.$('#prog');
    const progLabel = O.$('#prog-label');

    const api = {
      root: app,
      files,
      el: (s) => O.$(s),
      val: (name) => {
        const el = O.$(`[data-opt="${name}"]`);
        if (!el) return undefined;
        if (el.type === 'checkbox') return el.checked;
        if (el.type === 'number' || el.type === 'range') return el.value === '' ? undefined : Number(el.value);
        return el.value;
      },
      setProgress(pct, label) {
        if (pct === null) {
          prog.classList.remove('on');
          progLabel.classList.remove('on');
          return;
        }
        prog.classList.add('on');
        progLabel.classList.add('on');
        prog.querySelector('i').style.width = Math.max(2, Math.min(100, pct)) + '%';
        if (label) progLabel.textContent = label;
      },
      refresh() {
        O.renderFileList(listEl, files, { reorder: !!tool.reorder, onChange: () => api.refresh() });
        if (tool.onFiles) tool.onFiles(api).catch((e) => O.showError(errorEl, e.message));
      },
      error: (msg) => O.showError(errorEl, msg),
      clearMessages() {
        errorEl.innerHTML = '';
        resultEl.classList.remove('on');
        resultEl.innerHTML = '';
      },
      result: (blob, filename, detail) => O.showResult(resultEl, 'Terminé !', detail || `${filename} · ${O.fmtSize(blob.size)}`, blob, filename),
      download: O.download,
      toast: O.toast
    };

    O.dropzone(dz, {
      accept: tool.accept,
      multiple: tool.multiple !== false,
      onFiles: async (incoming) => {
        api.clearMessages();
        if (tool.multiple === false) files.length = 0;
        for (const f of incoming) {
          const entry = f;
          try {
            if (tool.validate !== false && /\.pdf$/i.test(f.name)) {
              const info = await O.assertPdf(f);
              entry.pages = info.pages;
            }
          } catch (e) {
            O.showError(errorEl, e.message);
            continue;
          }
          files.push(entry);
          if (tool.maxFiles && files.length > tool.maxFiles) files.splice(tool.maxFiles);
        }
        api.refresh();
      }
    });

    if (tool.mount) tool.mount(api);

    btn.addEventListener('click', async () => {
      api.clearMessages();
      if (!files.length) {
        O.showError(errorEl, 'Ajoutez d’abord un fichier pour continuer.');
        return;
      }
      O.setBusy(btn, true, tool.busyLabel || 'Traitement…');
      api.setProgress(8, 'Préparation…');
      try {
        const out = await tool.run(api);
        api.setProgress(100, 'Terminé');
        setTimeout(() => api.setProgress(null), 900);
        if (out) {
          api.result(out.blob, out.filename, out.detail);
          O.toast('Votre fichier est prêt.');
        }
      } catch (e) {
        console.error(e);
        api.setProgress(null);
        O.showError(errorEl, e.message || 'Une erreur est survenue pendant le traitement.');
      } finally {
        O.setBusy(btn, false);
      }
    });
  }

  /* ====================== Routeur ====================== */
  function setActiveNav(key) {
    O.$$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
  }

  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);
    window.scrollTo(0, 0);

    if (parts.length === 0) {
      app.innerHTML = pageHome();
      setActiveNav('home');
      document.title = 'Outipro — Outils PDF gratuits, simples et confidentiels';
    } else if (parts[0] === 'outils') {
      app.innerHTML = pageTools();
      setActiveNav('tools');
      document.title = 'Tous les outils — Outipro';
    } else if (parts[0] === 'outil' && parts[1]) {
      const tool = O.tools.find((t) => t.slug === parts[1]);
      if (!tool) { app.innerHTML = page404(); return; }
      app.innerHTML = pageTool(tool);
      setActiveNav('tools');
      document.title = `${tool.name} — Outipro`;
      mountTool(tool);
    } else if (parts[0] === 'faq') {
      app.innerHTML = pageFaq(); setActiveNav('faq'); document.title = 'FAQ — Outipro';
    } else if (parts[0] === 'a-propos') {
      app.innerHTML = pageAbout(); setActiveNav('about'); document.title = 'À propos — Outipro';
    } else if (parts[0] === 'confidentialite') {
      app.innerHTML = pagePrivacy(); setActiveNav(''); document.title = 'Confidentialité — Outipro';
    } else {
      app.innerHTML = page404(); setActiveNav('');
      document.title = 'Page introuvable — Outipro';
    }
  }

  renderChrome();
  window.addEventListener('hashchange', route);
  route();
  O.route = route;
})();
