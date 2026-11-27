/* Outipro — conversion : PDF vers images/texte, compression, Word et images vers PDF */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;
  const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

  /* ---------------- PDF → JPG ---------------- */
  O.tools.push({
    slug: 'pdf-en-jpg',
    name: 'PDF en JPG',
    short: 'Convertissez chaque page d’un PDF en image JPG de haute qualité.',
    desc: 'Transformez les pages de votre PDF en images JPG, page par page. Idéal pour les présentations, les aperçus ou le partage sur les réseaux sociaux.',
    cat: 'Convertir',
    icon: 'image',
    color: 'c-rose',
    accept: '.pdf',
    multiple: false,
    action: 'Convertir en JPG',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Images JPG · archive ZIP si plusieurs pages',
    fields: `
      <div class="row">
        <div class="field">
          <label for="quality">Qualité</label>
          <select class="input" data-opt="quality" id="quality">
            <option value="0.92">Haute (92 %)</option>
            <option value="0.82" selected>Standard (82 %)</option>
            <option value="0.65">Compacte (65 %)</option>
          </select>
        </div>
        <div class="field">
          <label for="scale">Résolution</label>
          <select class="input" data-opt="scale" id="scale">
            <option value="1">Normale (72 dpi)</option>
            <option value="1.5" selected>Haute (108 dpi)</option>
            <option value="2">Très haute (144 dpi)</option>
            <option value="3">Impression (216 dpi)</option>
          </select>
        </div>
      </div>`,
    run: async (api) => {
      const file = api.files[0];
      const doc = await O.openPdfDoc(await O.readArrayBuffer(file));
      const quality = Number(api.val('quality') || 0.82);
      const scale = Number(api.val('scale') || 1.5);
      const base = O.baseName(file.name);
      const total = doc.numPages;
      const blobs = [];
      for (let i = 1; i <= total; i++) {
        api.setProgress(5 + (i / total) * 88, `Page ${i}/${total}…`);
        const canvas = await O.renderPage(doc, i, scale);
        const blob = await O.canvasToBlob(canvas, 'image/jpeg', quality);
        blobs.push({ blob, name: `${base}-page-${String(i).padStart(2, '0')}.jpg` });
      }
      if (blobs.length === 1) {
        return { blob: blobs[0].blob, filename: blobs[0].name, detail: `Image JPG · ${O.fmtSize(blobs[0].blob.size)}` };
      }
      api.setProgress(96, 'Création de l’archive…');
      const zip = new window.JSZip();
      blobs.forEach((b) => zip.file(b.name, b.blob));
      const out = await zip.generateAsync({ type: 'blob' });
      return { blob: out, filename: `${base}-images.zip`, detail: `${total} images JPG · ${O.fmtSize(out.size)}` };
    }
  });

  /* ---------------- PDF → texte ---------------- */
  O.tools.push({
    slug: 'pdf-en-texte',
    name: 'PDF en texte',
    short: 'Extrayez le texte sélectionnable d’un PDF dans un fichier .txt.',
    desc: 'Récupérez le contenu textuel de votre document, page par page, dans un fichier texte propre. Les PDF issus de scans sans OCR ne contiennent pas de texte exploitable.',
    cat: 'Convertir',
    icon: 'text',
    color: 'c-sky',
    accept: '.pdf',
    multiple: false,
    action: 'Extraire le texte',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Fichier .txt · texte sélectionnable uniquement',
    fields: `
      <label class="check"><input type="checkbox" data-opt="marks" id="marks"> Ajouter des séparateurs de page</label>`,
    run: async (api) => {
      const file = api.files[0];
      const doc = await O.openPdfDoc(await O.readArrayBuffer(file));
      const marks = api.val('marks');
      const parts = [];
      let chars = 0;
      for (let i = 1; i <= doc.numPages; i++) {
        api.setProgress(5 + (i / doc.numPages) * 88, `Lecture page ${i}/${doc.numPages}…`);
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let lastY = null;
        let line = '';
        const lines = [];
        content.items.forEach((item) => {
          if (!item.str) return;
          const y = item.transform[5];
          if (lastY !== null && Math.abs(y - lastY) > 3) {
            lines.push(line.trimEnd());
            line = '';
          }
          line += item.str + (item.hasEOL ? '' : ' ');
          lastY = y;
        });
        if (line.trim()) lines.push(line.trimEnd());
        const text = lines.join('\n').replace(/[ \t]+\n/g, '\n');
        chars += text.length;
        parts.push((marks ? `\n----- Page ${i} -----\n` : '') + text);
      }
      if (!chars) throw new Error('Aucun texte détecté : ce PDF est probablement une image scannée (OCR nécessaire).');
      const blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${O.baseName(file.name)}.txt`,
        detail: `${chars.toLocaleString('fr-FR')} caractères extraits de ${doc.numPages} pages`
      };
    }
  });

  /* ---------------- Compresser ---------------- */
  O.tools.push({
    slug: 'compresser-pdf',
    name: 'Compresser un PDF',
    short: 'Réduisez le poids d’un PDF pour l’envoyer plus facilement par e-mail.',
    desc: 'Allégez vos documents en convertissant les pages en images optimisées. Choisissez le niveau de compression : plus il est élevé, plus le fichier est léger.',
    cat: 'Optimiser',
    icon: 'compress',
    color: 'c-amber',
    accept: '.pdf',
    multiple: false,
    action: 'Compresser le PDF',
    busyLabel: 'Compression…',
    dropTitle: 'Déposez votre PDF ici',
    hint: 'Le texte devient non sélectionnable après compression',
    fields: `
      <div class="field">
        <label for="level">Niveau de compression</label>
        <select class="input" data-opt="level" id="level">
          <option value="light">Léger — qualité maximale</option>
          <option value="balanced" selected>Équilibré — recommandé</option>
          <option value="strong">Fort — fichier minimal</option>
        </select>
        <div class="help">La compression aplatit les pages en images. Conservez toujours l’original.</div>
      </div>`,
    run: async (api) => {
      const { jsPDF } = window.jspdf;
      const file = api.files[0];
      const level = api.val('level') || 'balanced';
      const cfg = {
        light: { scale: 1.6, quality: 0.85 },
        balanced: { scale: 1.25, quality: 0.68 },
        strong: { scale: 0.95, quality: 0.5 }
      }[level];
      const doc = await O.openPdfDoc(await O.readArrayBuffer(file));
      let pdf = null;
      for (let i = 1; i <= doc.numPages; i++) {
        api.setProgress(4 + (i / doc.numPages) * 90, `Compression page ${i}/${doc.numPages}…`);
        const canvas = await O.renderPage(doc, i, cfg.scale);
        const data = canvas.toDataURL('image/jpeg', cfg.quality);
        const w = canvas.width / cfg.scale;
        const h = canvas.height / cfg.scale;
        if (!pdf) {
          pdf = new jsPDF({ unit: 'pt', format: [w, h], orientation: w > h ? 'landscape' : 'portrait', compress: true });
        } else {
          pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
        }
        pdf.addImage(data, 'JPEG', 0, 0, w, h, undefined, 'FAST');
      }
      const blob = pdf.output('blob');
      const saved = file.size > 0 ? Math.round((1 - blob.size / file.size) * 100) : 0;
      return {
        blob,
        filename: `${O.baseName(file.name)}-compresse.pdf`,
        detail: saved > 0
          ? `Poids réduit de ${saved} % (${O.fmtSize(file.size)} → ${O.fmtSize(blob.size)})`
          : `Fichier généré (${O.fmtSize(blob.size)}) — l’original était déjà optimisé`
      };
    }
  });

  /* ---------------- Word → PDF ---------------- */
  O.tools.push({
    slug: 'word-en-pdf',
    name: 'Word en PDF',
    short: 'Convertissez un document .docx en PDF lisible et partageable.',
    desc: 'Transformez vos documents Word (.docx) en PDF. La mise en forme essentielle — titres, paragraphes, listes — est conservée. Les images ne sont pas reprises.',
    cat: 'Convertir',
    icon: 'fileWord',
    color: 'c-sky',
    accept: '.docx',
    multiple: false,
    action: 'Convertir en PDF',
    validate: false,
    dropTitle: 'Déposez votre document Word',
    hint: '.docx uniquement · images non reprises',
    fields: `
      <div class="row">
        <div class="field">
          <label for="size">Taille du texte</label>
          <select class="input" data-opt="size" id="size">
            <option value="10">10 pt</option>
            <option value="11" selected>11 pt</option>
            <option value="12">12 pt</option>
          </select>
        </div>
        <div class="field">
          <label for="margin">Marges</label>
          <select class="input" data-opt="margin" id="margin">
            <option value="40">Normales</option>
            <option value="25">Étroites</option>
            <option value="55">Larges</option>
          </select>
        </div>
      </div>`,
    run: async (api) => {
      if (!window.mammoth) throw new Error('Le convertisseur Word n’a pas pu être chargé.');
      const { jsPDF } = window.jspdf;
      const file = api.files[0];
      const buf = await O.readArrayBuffer(file);
      const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
      const container = document.createElement('div');
      container.innerHTML = result.value || '';
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = Number(api.val('margin') || 40);
      const base = Number(api.val('size') || 11);
      let y = margin;
      const ensure = (need) => {
        if (y + need > pageH - margin) {
          pdf.addPage();
          y = margin;
        }
      };
      // Aplatit les listes pour traiter chaque puce séparément
      const blocks = [];
      Array.from(container.children).forEach((node) => {
        const tag = node.tagName.toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          Array.from(node.querySelectorAll(':scope > li')).forEach((li) => {
            const clone = document.createElement('li');
            clone.textContent = li.textContent;
            blocks.push(clone);
          });
        } else {
          blocks.push(node);
        }
      });
      if (!blocks.length && container.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = container.textContent;
        blocks.push(p);
      }
      blocks.forEach((node) => {
        const tag = node.tagName.toLowerCase();
        let size = base;
        let style = 'normal';
        let gapBefore = 0;
        let gapAfter = 8;
        if (tag === 'h1') { size = base + 9; style = 'bold'; gapBefore = 12; gapAfter = 12; }
        else if (tag === 'h2') { size = base + 5; style = 'bold'; gapBefore = 10; gapAfter = 9; }
        else if (tag === 'h3') { size = base + 2; style = 'bold'; gapBefore = 8; gapAfter = 7; }
        else if (tag === 'li') { size = base; gapAfter = 5; }
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (!text) return;
        y += gapBefore;
        pdf.setFont('helvetica', style);
        pdf.setFontSize(size);
        const indent = tag === 'li' ? 14 : 0;
        if (tag === 'li') {
          ensure(size * 1.4);
          pdf.text('•', margin + 2, y + size);
        }
        const lines = pdf.splitTextToSize(text, pageW - margin * 2 - indent);
        lines.forEach((line) => {
          ensure(size * 1.45);
          pdf.text(line, margin + indent, y + size);
          y += size * 1.45;
        });
        y += gapAfter - size * 0.45;
      });
      const blob = pdf.output('blob');
      return {
        blob,
        filename: `${O.baseName(file.name)}.pdf`,
        detail: `Document converti · ${O.fmtSize(blob.size)}`
      };
    }
  });

  /* ---------------- Images → PDF ---------------- */
  O.tools.push({
    slug: 'images-en-pdf',
    name: 'Images en PDF',
    short: 'Rassemblez vos JPG et PNG dans un seul PDF, une image par page.',
    desc: 'Créez un PDF à partir de vos photos ou captures d’écran. Choisissez le format de page, l’orientation et les marges. L’ordre des images est personnalisable.',
    cat: 'Convertir',
    icon: 'filePdf',
    color: 'c-violet',
    accept: 'image/jpeg,image/png,image/webp',
    action: 'Créer le PDF',
    reorder: true,
    validate: false,
    dropTitle: 'Déposez vos images ici',
    dropSub: 'JPG, PNG ou WebP — plusieurs fichiers acceptés',
    hint: 'Une image par page',
    fields: `
      <div class="row">
        <div class="field">
          <label for="format">Format de page</label>
          <select class="input" data-opt="format" id="format">
            <option value="fit">Adapté à l’image</option>
            <option value="a4" selected>A4</option>
            <option value="letter">Letter</option>
          </select>
        </div>
        <div class="field">
          <label for="margin">Marge</label>
          <select class="input" data-opt="margin" id="margin">
            <option value="0" selected>Aucune</option>
            <option value="18">Petite</option>
            <option value="36">Moyenne</option>
          </select>
        </div>
      </div>`,
    run: async (api) => {
      const { PDFDocument } = O.pdfLib();
      const doc = await PDFDocument.create();
      const format = api.val('format') || 'a4';
      const margin = Number(api.val('margin') || 0);
      const sizes = { a4: [595.28, 841.89], letter: [612, 792] };

      for (let i = 0; i < api.files.length; i++) {
        api.setProgress(5 + (i / api.files.length) * 88, `Image ${i + 1}/${api.files.length}…`);
        const f = api.files[i];
        const bytes = await O.readArrayBuffer(f);
        let img;
        if (/\.png$/i.test(f.name)) img = await doc.embedPng(bytes);
        else if (/\.jpe?g$/i.test(f.name)) img = await doc.embedJpg(bytes);
        else {
          const dataUrl = await O.readDataURL(f);
          const im = await O.loadImage(dataUrl);
          const c = document.createElement('canvas');
          c.width = im.naturalWidth;
          c.height = im.naturalHeight;
          c.getContext('2d').drawImage(im, 0, 0);
          const png = await O.canvasToBlob(c, 'image/png');
          img = await doc.embedPng(await png.arrayBuffer());
        }
        let pw, ph;
        if (format === 'fit') {
          pw = img.width + margin * 2;
          ph = img.height + margin * 2;
        } else {
          [pw, ph] = sizes[format];
          if (img.width > img.height) [pw, ph] = [ph, pw];
        }
        const page = doc.addPage([pw, ph]);
        const maxW = pw - margin * 2;
        const maxH = ph - margin * 2;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
      const bytes = await doc.save();
      return {
        blob: pdfBlob(bytes),
        filename: 'outipro-images.pdf',
        detail: `${api.files.length} image${api.files.length > 1 ? 's' : ''} · ${O.fmtSize(bytes.byteLength)}`
      };
    }
  });
})();
