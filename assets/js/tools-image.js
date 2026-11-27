/* Outipro — outils image : compression, conversion de format, redimensionnement */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;

  async function imageFromFile(file) {
    const url = await O.readDataURL(file);
    const img = await O.loadImage(url);
    return { img, url };
  }

  function drawToCanvas(img, w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (w !== img.naturalWidth || h !== img.naturalHeight) {
      ctx.drawImage(img, 0, 0, c.width, c.height);
    } else {
      ctx.drawImage(img, 0, 0);
    }
    return c;
  }

  async function processImages(api, handler, ext, mime) {
    const out = [];
    for (let i = 0; i < api.files.length; i++) {
      api.setProgress(5 + (i / api.files.length) * 88, `Image ${i + 1}/${api.files.length}…`);
      const file = api.files[i];
      const { img } = await imageFromFile(file);
      const blob = await handler(img, file);
      out.push({ blob, name: `${O.baseName(file.name)}.${ext}` });
    }
    if (out.length === 1) {
      return { blob: out[0].blob, filename: out[0].name, detail: `${O.fmtSize(out[0].blob.size)} · ${mime}` };
    }
    api.setProgress(96, 'Création de l’archive…');
    const zip = new window.JSZip();
    out.forEach((o) => zip.file(o.name, o.blob));
    const blob = await zip.generateAsync({ type: 'blob' });
    return { blob, filename: 'outipro-images.zip', detail: `${out.length} images · ${O.fmtSize(blob.size)}` };
  }

  /* ---------------- Compresser une image ---------------- */
  O.tools.push({
    slug: 'compresser-image',
    name: 'Compresser une image',
    short: 'Réduisez le poids d’une photo sans dégrader visiblement sa qualité.',
    desc: 'Optimisez vos images JPG, PNG ou WebP pour le web ou l’e-mail. Réglez la qualité et la largeur maximale, puis comparez le gain obtenu.',
    cat: 'Images',
    icon: 'compress',
    color: 'c-teal',
    accept: 'image/jpeg,image/png,image/webp',
    action: 'Compresser l’image',
    validate: false,
    dropTitle: 'Déposez vos images ici',
    dropSub: 'JPG, PNG ou WebP',
    hint: 'Sortie JPG optimisée',
    fields: `
      <div class="field">
        <label for="quality">Qualité : <span id="q-val">75</span> %</label>
        <input class="input" type="range" data-opt="quality" id="quality" min="30" max="95" value="75" step="5">
      </div>
      <div class="field">
        <label for="maxw">Largeur maximale (px)</label>
        <input class="input" type="number" data-opt="maxw" id="maxw" value="1920" min="200" max="6000">
        <div class="help">L’image n’est jamais agrandie.</div>
      </div>`,
    mount: (api) => {
      const range = api.el('#quality');
      const label = api.el('#q-val');
      if (range && label) range.addEventListener('input', () => (label.textContent = range.value));
    },
    run: async (api) => {
      const quality = Number(api.val('quality') || 75) / 100;
      const maxw = Number(api.val('maxw') || 1920);
      return processImages(api, async (img) => {
        const ratio = Math.min(1, maxw / img.naturalWidth);
        const canvas = drawToCanvas(img, img.naturalWidth * ratio, img.naturalHeight * ratio);
        return O.canvasToBlob(canvas, 'image/jpeg', quality);
      }, 'jpg', 'image/jpeg');
    }
  });

  /* ---------------- Convertir une image ---------------- */
  O.tools.push({
    slug: 'convertir-image',
    name: 'Convertir une image',
    short: 'Passez d’un format à l’autre : JPG, PNG ou WebP.',
    desc: 'Convertissez vos images entre les formats les plus courants. Le PNG préserve la transparence, le JPG allège les photos, le WebP combine les deux.',
    cat: 'Images',
    icon: 'palette',
    color: 'c-violet',
    accept: 'image/jpeg,image/png,image/webp',
    action: 'Convertir l’image',
    validate: false,
    dropTitle: 'Déposez vos images ici',
    dropSub: 'JPG, PNG ou WebP',
    hint: 'Conversion locale, sans perte de dimensions',
    fields: `
      <div class="row">
        <div class="field">
          <label for="format">Format de sortie</label>
          <select class="input" data-opt="format" id="format">
            <option value="png">PNG (transparence)</option>
            <option value="jpg" selected>JPG (photo)</option>
            <option value="webp">WebP (moderne)</option>
          </select>
        </div>
        <div class="field">
          <label for="quality">Qualité</label>
          <select class="input" data-opt="quality" id="quality">
            <option value="0.95">Maximale</option>
            <option value="0.85" selected>Élevée</option>
            <option value="0.7">Moyenne</option>
          </select>
        </div>
      </div>`,
    run: async (api) => {
      const format = api.val('format') || 'jpg';
      const quality = Number(api.val('quality') || 0.85);
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      return processImages(api, async (img) => {
        const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
        if (format === 'jpg') {
          const ctx = canvas.getContext('2d');
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        return O.canvasToBlob(canvas, mime, quality);
      }, format === 'jpg' ? 'jpg' : format, mime);
    }
  });

  /* ---------------- Redimensionner ---------------- */
  O.tools.push({
    slug: 'redimensionner-image',
    name: 'Redimensionner une image',
    short: 'Adaptez les dimensions d’une image en pixels, avec ratio conservé.',
    desc: 'Modifiez la largeur et la hauteur d’une image pour un site web, un réseau social ou une impression. Le ratio est conservé par défaut.',
    cat: 'Images',
    icon: 'resize',
    color: 'c-sky',
    accept: 'image/jpeg,image/png,image/webp',
    action: 'Redimensionner',
    validate: false,
    dropTitle: 'Déposez vos images ici',
    dropSub: 'JPG, PNG ou WebP',
    hint: 'Dimensions en pixels',
    fields: `
      <div class="row">
        <div class="field">
          <label for="w">Largeur (px)</label>
          <input class="input" type="number" data-opt="w" id="w" value="1280" min="16" max="10000">
        </div>
        <div class="field">
          <label for="h">Hauteur (px)</label>
          <input class="input" type="number" data-opt="h" id="h" value="720" min="16" max="10000">
        </div>
      </div>
      <label class="check"><input type="checkbox" data-opt="ratio" id="ratio" checked> Conserver les proportions</label>`,
    run: async (api) => {
      let w = Number(api.val('w') || 1280);
      let h = Number(api.val('h') || 720);
      const keep = api.val('ratio');
      return processImages(api, async (img) => {
        let tw = w, th = h;
        if (keep) {
          const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
          tw = img.naturalWidth * r;
          th = img.naturalHeight * r;
        }
        const canvas = drawToCanvas(img, tw, th);
        return O.canvasToBlob(canvas, 'image/png');
      }, 'png', 'image/png');
    }
  });
})();
