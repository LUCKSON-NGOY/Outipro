/* Outipro — outils PDF : fusion, division, extraction et suppression de pages */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;

  const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

  function compressRanges(set) {
    const nums = Array.from(set).map((n) => n + 1).sort((a, b) => a - b);
    const out = [];
    let i = 0;
    while (i < nums.length) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(i === j ? String(nums[i]) : `${nums[i]}-${nums[j]}`);
      i = j + 1;
    }
    return out.join(',');
  }
  O.compressRanges = compressRanges;

  /* Sélecteur visuel de pages */
  async function pagePicker(api, opts) {
    const file = api.files[0];
    if (!file) {
      api.el('#extra').innerHTML = '';
      return;
    }
    const extra = api.el('#extra');
    extra.innerHTML = `<div class="mt-2">
      <div class="small muted" style="margin-bottom:8px">${opts.hint}</div>
      <div class="thumb-grid" id="thumbs"><div class="small muted">Chargement des aperçus…</div></div>
    </div>`;
    const grid = api.el('#thumbs');
    let doc;
    try {
      doc = await O.openPdfDoc(await O.readArrayBuffer(file));
    } catch (e) {
      grid.innerHTML = `<div class="alert alert-error">${I.alert}<div>Aperçu impossible : PDF protégé ou endommagé.</div></div>`;
      return;
    }
    await O.thumbnails(doc, grid, 0.26, 60);
    const input = api.el(`[data-opt="${opts.inputName}"]`);
    const selected = new Set();
    const sync = () => {
      if (input) input.value = compressRanges(selected);
    };
    grid.addEventListener('click', (e) => {
      const t = e.target.closest('.thumb');
      if (!t) return;
      const p = Number(t.dataset.page);
      if (selected.has(p)) selected.delete(p);
      else selected.add(p);
      t.classList.toggle('sel');
      sync();
    });
    if (opts.selectAll) {
      O.$$('.thumb', grid).forEach((t) => {
        t.classList.add('sel');
        selected.add(Number(t.dataset.page));
      });
      sync();
    }
    if (doc.numPages > 60) {
      const note = document.createElement('div');
      note.className = 'small muted mt-1';
      note.textContent = 'Aperçu limité aux 60 premières pages ; utilisez le champ de saisie pour les suivantes.';
      extra.appendChild(note);
    }
  }

  /* ---------------- Fusionner ---------------- */
  O.tools.push({
    slug: 'fusionner-pdf',
    name: 'Fusionner des PDF',
    short: 'Combinez plusieurs PDF en un seul document, dans l’ordre de votre choix.',
    desc: 'Réunissez plusieurs fichiers PDF en un document unique. Réorganisez l’ordre avec les flèches, puis téléchargez le résultat.',
    cat: 'Organiser',
    icon: 'merge',
    color: '',
    accept: '.pdf',
    action: 'Fusionner les PDF',
    dropTitle: 'Déposez vos PDF ici',
    dropSub: 'ou cliquez pour sélectionner plusieurs fichiers',
    hint: '2 fichiers ou plus · PDF uniquement',
    reorder: true,
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const out = await PDFDocument.create();
      let total = 0;
      for (let i = 0; i < api.files.length; i++) {
        api.setProgress(10 + (i / api.files.length) * 80, `Fusion ${i + 1}/${api.files.length}…`);
        const buf = await O.readArrayBuffer(api.files[i]);
        let src;
        try {
          src = await PDFDocument.load(buf);
        } catch (e) {
          throw new Error(`Impossible de lire « ${api.files[i].name} » (PDF protégé ou corrompu).`);
        }
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        total += pages.length;
      }
      out.setProducer('Outipro');
      out.setCreationDate(new Date());
      const bytes = await out.save();
      return {
        blob: pdfBlob(bytes),
        filename: 'outipro-fusion.pdf',
        detail: `${total} pages fusionnées depuis ${api.files.length} fichiers · ${O.fmtSize(bytes.byteLength)}`
      };
    }
  });

  /* ---------------- Diviser ---------------- */
  O.tools.push({
    slug: 'diviser-pdf',
    name: 'Diviser un PDF',
    short: 'Séparez un PDF en plusieurs fichiers ou extrayez des plages de pages.',
    desc: 'Découpez un document en fichiers distincts. Choisissez une page par fichier ou définissez vos propres plages. Le résultat est livré dans une archive ZIP.',
    cat: 'Organiser',
    icon: 'split',
    color: 'c-violet',
    accept: '.pdf',
    multiple: false,
    action: 'Diviser le PDF',
    dropTitle: 'Déposez votre PDF ici',
    dropSub: 'un seul fichier à la fois',
    hint: 'PDF uniquement · archive ZIP en sortie',
    fields: `
      <div class="field">
        <label for="mode">Mode de découpe</label>
        <select class="input" data-opt="mode" id="mode">
          <option value="each">Une page par fichier</option>
          <option value="ranges">Plages personnalisées</option>
        </select>
      </div>
      <div class="field">
        <label for="ranges">Plages (mode personnalisé)</label>
        <input class="input" type="text" data-opt="ranges" id="ranges" placeholder="1-3, 4-6, 7">
        <div class="help">Exemple : « 1-3, 4-6, 7 » crée trois fichiers.</div>
      </div>`,
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const JSZip = window.JSZip;
      const file = api.files[0];
      const buf = await O.readArrayBuffer(file);
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const mode = api.val('mode');
      const zip = new JSZip();
      const base = O.baseName(file.name);

      if (mode === 'each') {
        for (let i = 0; i < total; i++) {
          api.setProgress(10 + (i / total) * 85, `Page ${i + 1}/${total}…`);
          const doc = await PDFDocument.create();
          const [page] = await doc.copyPages(src, [i]);
          doc.addPage(page);
          zip.file(`${base}-page-${String(i + 1).padStart(2, '0')}.pdf`, await doc.save());
        }
      } else {
        const groups = String(api.val('ranges') || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!groups.length) throw new Error('Indiquez au moins une plage de pages (ex. 1-3).');
        for (let g = 0; g < groups.length; g++) {
          const idx = O.parseRanges(groups[g], total);
          if (!idx.length) throw new Error(`La plage « ${groups[g]} » ne contient aucune page valide (document de ${total} pages).`);
          const doc = await PDFDocument.create();
          const pages = await doc.copyPages(src, idx);
          pages.forEach((p) => doc.addPage(p));
          zip.file(`${base}-${groups[g].replace(/[^0-9-]/g, '')}.pdf`, await doc.save());
        }
      }
      api.setProgress(95, 'Création de l’archive…');
      const blob = await zip.generateAsync({ type: 'blob' });
      return {
        blob,
        filename: `${base}-divise.zip`,
        detail: `Archive ZIP · ${O.fmtSize(blob.size)}`
      };
    }
  });

  /* ---------------- Extraire des pages ---------------- */
  O.tools.push({
    slug: 'extraire-pages',
    name: 'Extraire des pages',
    short: 'Récupérez uniquement les pages qui vous intéressent dans un nouveau PDF.',
    desc: 'Sélectionnez les pages à conserver en cliquant sur les aperçus ou en saisissant leurs numéros. Un nouveau document ne contenant que ces pages sera généré.',
    cat: 'Organiser',
    icon: 'layers',
    color: 'c-teal',
    accept: '.pdf',
    multiple: false,
    action: 'Extraire les pages',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Cliquez sur les pages à conserver',
    fields: `
      <div class="field">
        <label for="pages">Pages à extraire</label>
        <input class="input" type="text" data-opt="pages" id="pages" placeholder="1-3, 7, 10-12">
        <div class="help">Laissez vide et cliquez sur les aperçus ci-dessus.</div>
      </div>`,
    onFiles: (api) => pagePicker(api, { inputName: 'pages', hint: 'Cliquez sur les pages à conserver.' }),
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const file = api.files[0];
      const src = await PDFDocument.load(await O.readArrayBuffer(file));
      const total = src.getPageCount();
      const idx = O.parseRanges(api.val('pages'), total);
      if (!idx.length) throw new Error('Sélectionnez au moins une page à extraire.');
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, idx);
      pages.forEach((p) => doc.addPage(p));
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-extrait.pdf`,
        detail: `${idx.length} page${idx.length > 1 ? 's' : ''} extraite${idx.length > 1 ? 's' : ''} · ${O.fmtSize(bytes.byteLength)}`
      };
    }
  });

  /* ---------------- Supprimer des pages ---------------- */
  O.tools.push({
    slug: 'supprimer-pages',
    name: 'Supprimer des pages',
    short: 'Retirez les pages inutiles d’un PDF en quelques clics.',
    desc: 'Cliquez sur les pages à supprimer dans les aperçus, ou saisissez leurs numéros. Le reste du document est conservé à l’identique.',
    cat: 'Organiser',
    icon: 'trash',
    color: 'c-rose',
    accept: '.pdf',
    multiple: false,
    action: 'Supprimer les pages',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Cliquez sur les pages à supprimer',
    fields: `
      <div class="field">
        <label for="pages">Pages à supprimer</label>
        <input class="input" type="text" data-opt="pages" id="pages" placeholder="2, 5-6">
        <div class="help">Vous pouvez aussi cliquer sur les aperçus.</div>
      </div>`,
    onFiles: (api) => pagePicker(api, { inputName: 'pages', hint: 'Cliquez sur les pages à supprimer.' }),
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const file = api.files[0];
      const src = await PDFDocument.load(await O.readArrayBuffer(file));
      const total = src.getPageCount();
      const toRemove = new Set(O.parseRanges(api.val('pages'), total));
      if (!toRemove.size) throw new Error('Sélectionnez au moins une page à supprimer.');
      if (toRemove.size >= total) throw new Error('Impossible de supprimer toutes les pages du document.');
      const keep = [];
      for (let i = 0; i < total; i++) if (!toRemove.has(i)) keep.push(i);
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, keep);
      pages.forEach((p) => doc.addPage(p));
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-nettoye.pdf`,
        detail: `${toRemove.size} page${toRemove.size > 1 ? 's' : ''} supprimée${toRemove.size > 1 ? 's' : ''} · ${keep.length} restantes`
      };
    }
  });
})();
