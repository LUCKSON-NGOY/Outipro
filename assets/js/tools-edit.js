/* Outipro — outils d'édition PDF : rotation, numérotation, filigrane, signature */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;
  const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

  /* ---------------- Pivoter ---------------- */
  O.tools.push({
    slug: 'pivoter-pdf',
    name: 'Pivoter un PDF',
    short: 'Faites pivoter tout ou partie des pages de 90, 180 ou 270 degrés.',
    desc: 'Redressez un document scanné à l’envers ou tournez certaines pages. Indiquez « toutes » ou une sélection de pages.',
    cat: 'Organiser',
    icon: 'rotate',
    color: 'c-amber',
    accept: '.pdf',
    multiple: false,
    action: 'Pivoter le PDF',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Rotation appliquée sans perte de qualité',
    fields: `
      <div class="row">
        <div class="field">
          <label for="angle">Rotation</label>
          <select class="input" data-opt="angle" id="angle">
            <option value="90">90° horaire</option>
            <option value="180">180°</option>
            <option value="270">90° antihoraire</option>
          </select>
        </div>
        <div class="field">
          <label for="pages">Pages</label>
          <input class="input" type="text" data-opt="pages" id="pages" placeholder="toutes">
        </div>
      </div>`,
    run: async (api) => {
      const { PDFDocument, degrees } = O.pdfLib();
      const file = api.files[0];
      const doc = await PDFDocument.load(await O.readArrayBuffer(file));
      const total = doc.getPageCount();
      const angle = Number(api.val('angle')) || 90;
      const raw = String(api.val('pages') || '').trim();
      const idx = raw ? O.parseRanges(raw, total) : doc.getPageIndices();
      if (!idx.length) throw new Error('Aucune page valide sélectionnée.');
      idx.forEach((i) => {
        const page = doc.getPage(i);
        const current = page.getRotation().angle || 0;
        page.setRotation(degrees((current + angle) % 360));
      });
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-pivote.pdf`,
        detail: `${idx.length} page${idx.length > 1 ? 's' : ''} pivotée${idx.length > 1 ? 's' : ''} de ${angle}°`
      };
    }
  });

  /* ---------------- Numéroter ---------------- */
  O.tools.push({
    slug: 'numeroter-pdf',
    name: 'Numéroter les pages',
    short: 'Ajoutez une numérotation propre et personnalisable à votre document.',
    desc: 'Insérez des numéros de page avec le format, la position et la taille de votre choix. Idéal pour les mémoires, rapports et dossiers.',
    cat: 'Éditer',
    icon: 'hash',
    color: 'c-sky',
    accept: '.pdf',
    multiple: false,
    action: 'Ajouter la numérotation',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Position et format au choix',
    fields: `
      <div class="row">
        <div class="field">
          <label for="pos">Position</label>
          <select class="input" data-opt="pos" id="pos">
            <option value="bottom-center">Bas — centré</option>
            <option value="bottom-right">Bas — droite</option>
            <option value="bottom-left">Bas — gauche</option>
            <option value="top-center">Haut — centré</option>
            <option value="top-right">Haut — droite</option>
            <option value="top-left">Haut — gauche</option>
          </select>
        </div>
        <div class="field">
          <label for="format">Format</label>
          <select class="input" data-opt="format" id="format">
            <option value="n">1</option>
            <option value="n-slash">1 / N</option>
            <option value="page-n">Page 1</option>
            <option value="page-n-sur">Page 1 sur N</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="start">Premier numéro</label>
          <input class="input" type="number" data-opt="start" id="start" value="1" min="0">
        </div>
        <div class="field">
          <label for="size">Taille de police</label>
          <input class="input" type="number" data-opt="size" id="size" value="11" min="6" max="36">
        </div>
      </div>`,
    run: async (api) => {
      const { PDFDocument, StandardFonts, rgb } = O.pdfLib();
      const file = api.files[0];
      const doc = await PDFDocument.load(await O.readArrayBuffer(file));
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const total = doc.getPageCount();
      const pos = api.val('pos') || 'bottom-center';
      const format = api.val('format') || 'n';
      const start = Number(api.val('start') ?? 1);
      const size = Number(api.val('size') || 11);
      const margin = 28;

      doc.getPages().forEach((page, i) => {
        const n = start + i;
        let label = String(n);
        if (format === 'n-slash') label = `${n} / ${total}`;
        if (format === 'page-n') label = `Page ${n}`;
        if (format === 'page-n-sur') label = `Page ${n} sur ${total}`;
        const w = font.widthOfTextAtSize(label, size);
        const { width, height } = page.getSize();
        let x = (width - w) / 2;
        if (pos.endsWith('left')) x = margin;
        if (pos.endsWith('right')) x = width - w - margin;
        const y = pos.startsWith('top') ? height - margin - size : margin;
        page.drawText(label, { x, y, size, font, color: rgb(0.35, 0.38, 0.45) });
      });
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-numerote.pdf`,
        detail: `${total} pages numérotées`
      };
    }
  });

  /* ---------------- Filigrane ---------------- */
  O.tools.push({
    slug: 'filigrane-pdf',
    name: 'Ajouter un filigrane',
    short: 'Apposez un texte en filigrane pour marquer un document comme brouillon ou confidentiel.',
    desc: 'Protégez visuellement vos documents avec un filigrane textuel : opacité, taille, couleur et inclinaison réglables. Le texte reste vectoriel et net à l’impression.',
    cat: 'Éditer',
    icon: 'droplet',
    color: 'c-violet',
    accept: '.pdf',
    multiple: false,
    action: 'Appliquer le filigrane',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Texte vectoriel · aucune perte de qualité',
    fields: `
      <div class="field">
        <label for="text">Texte du filigrane</label>
        <input class="input" type="text" data-opt="text" id="text" value="CONFIDENTIEL" maxlength="40">
      </div>
      <div class="row">
        <div class="field">
          <label for="size">Taille</label>
          <input class="input" type="number" data-opt="size" id="size" value="52" min="10" max="160">
        </div>
        <div class="field">
          <label for="opacity">Opacité (%)</label>
          <input class="input" type="number" data-opt="opacity" id="opacity" value="18" min="4" max="80">
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="angle">Inclinaison (°)</label>
          <input class="input" type="number" data-opt="angle" id="angle" value="45" min="-90" max="90">
        </div>
        <div class="field">
          <label for="color">Couleur</label>
          <select class="input" data-opt="color" id="color">
            <option value="gray">Gris</option>
            <option value="red">Rouge</option>
            <option value="blue">Bleu</option>
            <option value="green">Vert</option>
            <option value="black">Noir</option>
          </select>
        </div>
      </div>
      <label class="check"><input type="checkbox" data-opt="repeat" id="repeat"> Répéter en mosaïque</label>`,
    run: async (api) => {
      const { PDFDocument, StandardFonts, rgb, degrees } = O.pdfLib();
      const file = api.files[0];
      const doc = await PDFDocument.load(await O.readArrayBuffer(file));
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const text = String(api.val('text') || '').trim();
      if (!text) throw new Error('Saisissez le texte du filigrane.');
      const size = Number(api.val('size') || 52);
      const opacity = Math.min(0.8, Math.max(0.04, Number(api.val('opacity') || 18) / 100));
      const angle = Number(api.val('angle') || 45);
      const repeat = api.val('repeat');
      const colors = {
        gray: [0.45, 0.48, 0.55],
        red: [0.85, 0.15, 0.2],
        blue: [0.15, 0.35, 0.8],
        green: [0.1, 0.55, 0.35],
        black: [0.1, 0.1, 0.12]
      };
      const c = colors[api.val('color')] || colors.gray;

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const tw = font.widthOfTextAtSize(text, size);
        if (repeat) {
          const stepX = tw + 90;
          const stepY = size * 4.2;
          for (let y = -height; y < height * 2; y += stepY) {
            for (let x = -width; x < width * 2; x += stepX) {
              page.drawText(text, {
                x, y, size, font, rotate: degrees(angle),
                color: rgb(c[0], c[1], c[2]), opacity
              });
            }
          }
        } else {
          const rad = (angle * Math.PI) / 180;
          const th = font.heightAtSize(size) * 0.72;
          const x = width / 2 - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad);
          const y = height / 2 - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad);
          page.drawText(text, {
            x, y, size, font, rotate: degrees(angle),
            color: rgb(c[0], c[1], c[2]), opacity
          });
        }
      });
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-filigrane.pdf`,
        detail: `Filigrane « ${text} » appliqué sur ${doc.getPageCount()} pages`
      };
    }
  });

  /* ---------------- Signer ---------------- */
  O.tools.push({
    slug: 'signer-pdf',
    name: 'Signer un PDF',
    short: 'Dessinez votre signature et apposez-la sur la page de votre choix.',
    desc: 'Tracez votre signature à la souris ou au doigt, puis cliquez sur l’aperçu pour la positionner. Elle est appliquée à toutes les pages du document.',
    cat: 'Éditer',
    icon: 'signature',
    color: 'c-teal',
    accept: '.pdf',
    multiple: false,
    action: 'Apposer la signature',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Signature dessinée · reste sur votre appareil',
    fields: `
      <div class="field">
        <label>Votre signature</label>
        <canvas class="sig-pad" id="sig-pad" width="600" height="180"></canvas>
        <div class="help">Dessinez avec la souris ou le doigt, puis cliquez sur l’aperçu de la page pour positionner la signature.</div>
        <button class="btn btn-sm mt-1" id="sig-clear" type="button">${I.x} Effacer</button>
      </div>
      <div class="row">
        <div class="field">
          <label for="width">Largeur de la signature (% de la page)</label>
          <input class="input" type="number" data-opt="width" id="width" value="25" min="8" max="60">
        </div>
        <div class="field">
          <label for="pages">Pages</label>
          <input class="input" type="text" data-opt="pages" id="pages" placeholder="toutes">
        </div>
      </div>`,
    mount: (api) => {
      const canvas = api.el('#sig-pad');
      const ctx = canvas.getContext('2d');
      let drawing = false;
      let hasInk = false;
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: ((p.clientX - r.left) / r.width) * canvas.width, y: ((p.clientY - r.top) / r.height) * canvas.height };
      };
      const start = (e) => { e.preventDefault(); drawing = true; hasInk = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
      const move = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      const end = () => { drawing = false; };
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);
      api.el('#sig-clear').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasInk = false;
      });
      api.sigState = () => ({ canvas, hasInk });
    },
    onFiles: async (api) => {
      const file = api.files[0];
      if (!file) { api.el('#extra').innerHTML = ''; return; }
      const extra = api.el('#extra');
      extra.innerHTML = `<div class="mt-2">
        <div class="small muted" style="margin-bottom:8px">Cliquez sur la page pour positionner la signature.</div>
        <div class="preview-wrap" id="sign-preview"><div class="small muted">Chargement…</div></div>
      </div>`;
      try {
        const doc = await O.openPdfDoc(await O.readArrayBuffer(file));
        const canvas = await O.renderPage(doc, 1, 1.15);
        canvas.style.cursor = 'crosshair';
        const wrap = api.el('#sign-preview');
        wrap.innerHTML = '';
        wrap.appendChild(canvas);
        api.signPos = { x: 0.68, y: 0.82 };
        const marker = document.createElement('div');
        marker.style.cssText = 'position:absolute;border:2px dashed #2563eb;border-radius:4px;pointer-events:none;display:none;background:rgba(37,99,235,.10)';
        wrap.style.position = 'relative';
        wrap.appendChild(marker);
        const place = (e) => {
          const r = canvas.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          api.signPos = { x, y };
          const w = Number(api.val('width') || 25) / 100;
          marker.style.display = 'block';
          marker.style.left = canvas.offsetLeft + x * canvas.clientWidth - (w * canvas.clientWidth) / 2 + 'px';
          marker.style.top = canvas.offsetTop + y * canvas.clientHeight - (0.055 * canvas.clientHeight) / 2 + 'px';
          marker.style.width = w * canvas.clientWidth + 'px';
          marker.style.height = 0.11 * canvas.clientHeight + 'px';
        };
        canvas.addEventListener('click', place);
        api.signPosSet = true;
      } catch (e) {
        api.el('#sign-preview').innerHTML = `<div class="alert alert-error">${I.alert}<div>Aperçu impossible.</div></div>`;
      }
    },
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const state = api.sigState ? api.sigState() : null;
      if (!state || !state.hasInk) throw new Error('Dessinez d’abord votre signature dans le cadre prévu.');
      const file = api.files[0];
      const doc = await PDFDocument.load(await O.readArrayBuffer(file));
      const png = await new Promise((res) => state.canvas.toBlob(res, 'image/png'));
      const img = await doc.embedPng(await png.arrayBuffer());
      const total = doc.getPageCount();
      const raw = String(api.val('pages') || '').trim();
      const idx = raw ? O.parseRanges(raw, total) : doc.getPageIndices();
      if (!idx.length) throw new Error('Aucune page valide sélectionnée.');
      const ratio = img.width / img.height;
      const pos = api.signPos || { x: 0.7, y: 0.82 };
      idx.forEach((i) => {
        const page = doc.getPage(i);
        const { width, height } = page.getSize();
        const w = width * (Number(api.val('width') || 25) / 100);
        const h = w / ratio;
        const x = Math.min(Math.max(pos.x * width - w / 2, 4), width - w - 4);
        const y = Math.min(Math.max((1 - pos.y) * height - h / 2, 4), height - h - 4);
        page.drawImage(img, { x, y, width: w, height: h });
      });
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: `${O.baseName(file.name)}-signe.pdf`,
        detail: `Signature apposée sur ${idx.length} page${idx.length > 1 ? 's' : ''}`
      };
    }
  });
})();
