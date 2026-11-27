/* Outipro — outil d'organisation des pages : réordonner, pivoter, dupliquer, supprimer */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;

  const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

  let uid = 0;
  const state = { items: [], base: 'document', ready: false, dragId: null, limit: 0 };

  function updateCount(api) {
    const badge = api.el('#org-count');
    if (!badge) return;
    const n = state.items.length;
    badge.textContent = `${n} page${n > 1 ? 's' : ''}`;
    const reset = api.el('#org-reset');
    if (reset) reset.disabled = n === 0;
  }

  function cardHtml(item, index) {
    return `<div class="org-item" draggable="true" data-id="${item.id}">
      <div class="org-canvas" data-id="${item.id}"></div>
      <div class="org-num">${index + 1}</div>
      <div class="org-tools">
        <button class="org-btn" type="button" data-act="rot" data-id="${item.id}" title="Pivoter de 90°" aria-label="Pivoter la page de 90 degrés">${I.rotate}</button>
        <button class="org-btn" type="button" data-act="dup" data-id="${item.id}" title="Dupliquer" aria-label="Dupliquer la page">${I.copy}</button>
        <button class="org-btn" type="button" data-act="del" data-id="${item.id}" title="Supprimer" aria-label="Supprimer la page">${I.trash}</button>
      </div>
    </div>`;
  }

  function paint(api) {
    const grid = api.el('#org-grid');
    if (!grid) return;
    grid.innerHTML = state.items.map(cardHtml).join('');
    state.items.forEach((item) => {
      const holder = grid.querySelector(`.org-canvas[data-id="${item.id}"]`);
      if (!holder || !item.canvas) return;
      const rot = ((item.rot % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const clone = document.createElement('canvas');
      clone.width = swap ? item.canvas.height : item.canvas.width;
      clone.height = swap ? item.canvas.width : item.canvas.height;
      const ctx = clone.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, clone.width, clone.height);
      ctx.translate(clone.width / 2, clone.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(item.canvas, -item.canvas.width / 2, -item.canvas.height / 2);
      holder.appendChild(clone);
    });
    updateCount(api);
    bind(api);
  }

  function move(fromId, toId, before) {
    const from = state.items.findIndex((i) => i.id === fromId);
    const to = state.items.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0 || from === to) return false;
    const [item] = state.items.splice(from, 1);
    let target = state.items.findIndex((i) => i.id === toId);
    if (!before) target += 1;
    state.items.splice(target, 0, item);
    return true;
  }

  function bind(api) {
    const grid = api.el('#org-grid');
    if (!grid) return;

    grid.onclick = (e) => {
      const btn = e.target.closest('.org-btn');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const idx = state.items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const act = btn.dataset.act;
      if (act === 'rot') {
        state.items[idx].rot = (state.items[idx].rot + 90) % 360;
      } else if (act === 'dup') {
        const src = state.items[idx];
        state.items.splice(idx + 1, 0, {
          id: ++uid,
          page: src.page,
          rot: src.rot,
          canvas: src.canvas
        });
        api.toast('Page dupliquée.');
      } else if (act === 'del') {
        if (state.items.length <= 1) {
          api.toast('Le document doit conserver au moins une page.');
          return;
        }
        state.items.splice(idx, 1);
      }
      paint(api);
    };

    let dragId = null;
    O.$$('.org-item', grid).forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragId = Number(card.dataset.id);
        card.classList.add('dragging');
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(dragId));
        } catch (err) { /* ignore */ }
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        O.$$('.org-item', grid).forEach((c) => c.classList.remove('over', 'over-after'));
        dragId = null;
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragId === null || Number(card.dataset.id) === dragId) return;
        const rect = card.getBoundingClientRect();
        const after = e.clientX > rect.left + rect.width / 2;
        card.classList.toggle('over', !after);
        card.classList.toggle('over-after', after);
      });
      card.addEventListener('dragleave', () => card.classList.remove('over', 'over-after'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = Number(card.dataset.id);
        const rect = card.getBoundingClientRect();
        const before = e.clientX <= rect.left + rect.width / 2;
        const moved = dragId !== null && move(dragId, targetId, before);
        card.classList.remove('over', 'over-after');
        if (moved) paint(api);
      });
    });

    grid.onkeydown = (e) => {
      if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      const card = e.target.closest('.org-item');
      if (!card) return;
      e.preventDefault();
      const id = Number(card.dataset.id);
      const idx = state.items.findIndex((i) => i.id === id);
      const next = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
      if (idx < 0 || next < 0 || next >= state.items.length) return;
      const [item] = state.items.splice(idx, 1);
      state.items.splice(next, 0, item);
      paint(api);
      const again = api.el(`.org-item[data-id="${id}"]`);
      if (again) again.focus();
    };

    const reset = api.el('#org-reset');
    if (reset) {
      reset.onclick = () => {
        state.items.sort((a, b) => a.page - b.page || a.id - b.id);
        state.items.forEach((i) => (i.rot = 0));
        const seen = new Set();
        state.items = state.items.filter((i) => {
          const key = `${i.page}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        paint(api);
        api.toast('Ordre d’origine restauré.');
      };
    }
  }

  async function build(api) {
    const extra = api.el('#extra');
    const file = api.files[0];
    state.items = [];
    state.ready = false;
    state.base = file ? O.baseName(file.name) : 'document';
    if (!file) {
      extra.innerHTML = '';
      return;
    }
    extra.innerHTML = `<div class="org-wrap mt-2">
      <div class="org-head">
        <div>
          <strong>Aperçu des pages</strong>
          <div class="small muted">Glissez une page pour la déplacer, ou utilisez Alt + ← / →.</div>
        </div>
        <div class="org-actions">
          <span class="org-badge" id="org-count">…</span>
          <button class="btn btn-ghost btn-sm" type="button" id="org-reset" disabled>${I.refresh} Réinitialiser</button>
        </div>
      </div>
      <div class="org-grid" id="org-grid"><div class="small muted">Génération des aperçus…</div></div>
    </div>`;

    let doc;
    try {
      doc = await O.openPdfDoc(await O.readArrayBuffer(file));
    } catch (e) {
      api.el('#org-grid').innerHTML = `<div class="alert alert-error">${I.alert}<div>Aperçu impossible : PDF protégé ou endommagé.</div></div>`;
      return;
    }

    const total = doc.numPages;
    const limit = Math.min(total, 120);
    state.limit = limit;
    const grid = api.el('#org-grid');
    grid.innerHTML = '';
    for (let p = 1; p <= limit; p++) {
      const canvas = await O.renderPage(doc, p, 0.24);
      state.items.push({ id: ++uid, page: p, rot: 0, canvas });
      if (p % 8 === 0) api.setProgress((p / limit) * 100, `Aperçu ${p}/${limit}…`);
    }
    api.setProgress(null);
    paint(api);
    if (total > limit) {
      const note = document.createElement('div');
      note.className = 'small muted mt-1';
      note.textContent = `Aperçu limité aux ${limit} premières pages. Les ${total - limit} pages suivantes sont conservées telles quelles, à la fin du document.`;
      extra.appendChild(note);
    }
    state.ready = true;
  }

  O.tools.push({
    slug: 'organiser-pages',
    name: 'Organiser les pages',
    short: 'Réordonnez, pivotez, dupliquez ou supprimez les pages en glisser-déposer.',
    desc: 'Visualisez toutes les pages de votre PDF sous forme de vignettes, puis réorganisez-les par glisser-déposer. Pivotez une page de 90°, dupliquez-la ou supprimez-la avant d’enregistrer le document final.',
    cat: 'Organiser',
    icon: 'grip',
    color: 'c-sky',
    accept: '.pdf',
    multiple: false,
    action: 'Enregistrer le PDF',
    dropTitle: 'Déposez votre PDF ici',
    dropSub: 'ou cliquez pour sélectionner un fichier',
    hint: 'PDF uniquement · glisser-déposer pour réordonner',
    fields: '',
    onFiles: (api) => build(api),
    run: async (api) => {
      if (!state.ready || !state.items.length) throw new Error('Ajoutez un PDF et attendez la fin de la génération des aperçus.');
      const { PDFDocument, degrees } = O.pdfLib();
      const src = await PDFDocument.load(await O.readArrayBuffer(api.files[0]));
      const out = await PDFDocument.create();

      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i];
        api.setProgress(10 + (i / state.items.length) * 80, `Assemblage ${i + 1}/${state.items.length}…`);
        const [page] = await out.copyPages(src, [item.page - 1]);
        const base = page.getRotation().angle || 0;
        page.setRotation(degrees(((base + item.rot) % 360 + 360) % 360));
        out.addPage(page);
      }

      /* Les pages au-delà de l'aperçu (plafonné) sont conservées à la fin */
      const rest = [];
      for (let p = state.limit + 1; p <= src.getPageCount(); p++) rest.push(p - 1);
      if (rest.length) {
        const pages = await out.copyPages(src, rest);
        pages.forEach((p) => out.addPage(p));
      }

      out.setProducer('Outipro');
      out.setCreationDate(new Date());
      const bytes = await out.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${state.base}-organise.pdf`,
        detail: `${state.items.length} page${state.items.length > 1 ? 's' : ''} réorganisée${state.items.length > 1 ? 's' : ''} · ${O.fmtSize(bytes.byteLength)}`
      };
    }
  });
})();
