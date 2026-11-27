/* Outipro — noyau applicatif : utilitaires, PDF.js, dropzone, listes de fichiers */
(function () {
  const O = (window.OUTIPRO = window.OUTIPRO || {});
  O.tools = [];

  /* ---------- Sélecteurs ---------- */
  O.$ = (sel, root) => (root || document).querySelector(sel);
  O.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Formatage ---------- */
  O.fmtSize = function (bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace('.0', '') + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2).replace(/\.00$/, '') + ' Mo';
  };

  O.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  /* ---------- Téléchargement ---------- */
  O.download = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  O.baseName = function (name) {
    return String(name).replace(/\.[^.]+$/, '');
  };

  /* ---------- Toasts ---------- */
  O.toast = function (message, ms) {
    let wrap = O.$('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .25s, transform .25s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 260);
    }, ms || 3200);
  };

  /* ---------- Lecture de fichiers ---------- */
  O.readArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Lecture du fichier impossible : ' + file.name));
      r.readAsArrayBuffer(file);
    });

  O.readDataURL = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Lecture du fichier impossible : ' + file.name));
      r.readAsDataURL(file);
    });

  O.loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = src;
    });

  O.canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, type || 'image/jpeg', quality));

  /* ---------- Librairies ---------- */
  O.pdfLib = function () {
    if (!window.PDFLib) throw new Error('La librairie PDF n’a pas pu être chargée.');
    return window.PDFLib;
  };

  let pdfjsPromise = null;
  O.pdfjs = function () {
    if (!pdfjsPromise) {
      pdfjsPromise = new Promise((resolve, reject) => {
        if (!window.pdfjsLib) return reject(new Error('Le moteur PDF n’a pas pu être chargé.'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      });
    }
    return pdfjsPromise;
  };

  O.openPdfDoc = async function (arrayBuffer) {
    const pdfjsLib = await O.pdfjs();
    // pdf.js consomme le buffer : on en fournit toujours une copie
    return pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  };

  /* ---------- Rendu de page ---------- */
  O.renderPage = async function (pdfDoc, pageNumber, scale) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: scale || 1 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  };

  O.thumbnails = async function (pdfDoc, container, scale, maxPages) {
    container.innerHTML = '';
    const total = Math.min(pdfDoc.numPages, maxPages || 200);
    for (let i = 1; i <= total; i++) {
      const canvas = await O.renderPage(pdfDoc, i, scale || 0.28);
      const div = document.createElement('div');
      div.className = 'thumb';
      div.dataset.page = String(i - 1);
      div.appendChild(canvas);
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = i;
      div.appendChild(num);
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.innerHTML = window.ICONS.check;
      div.appendChild(tick);
      container.appendChild(div);
    }
  };

  /* ---------- Plages de pages ---------- */
  O.parseRanges = function (input, total) {
    const out = [];
    const seen = new Set();
    const clean = String(input || '').replace(/\s+/g, '');
    if (!clean) return out;
    clean.split(',').forEach((part) => {
      if (!part) return;
      const m = part.match(/^(\d+)?-(\d+)?$/);
      if (m) {
        let a = m[1] ? parseInt(m[1], 10) : 1;
        let b = m[2] ? parseInt(m[2], 10) : total;
        if (a > b) [a, b] = [b, a];
        for (let i = a; i <= b; i++) {
          if (i >= 1 && i <= total && !seen.has(i - 1)) {
            seen.add(i - 1);
            out.push(i - 1);
          }
        }
      } else if (/^\d+$/.test(part)) {
        const n = parseInt(part, 10);
        if (n >= 1 && n <= total && !seen.has(n - 1)) {
          seen.add(n - 1);
          out.push(n - 1);
        }
      }
    });
    return out;
  };

  /* ---------- Dropzone ---------- */
  O.dropzone = function (el, opts) {
    const accept = opts.accept || '.pdf';
    const multiple = opts.multiple !== false;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (multiple) input.multiple = true;
    el.appendChild(input);

    const handle = (files) => {
      const list = Array.from(files || []);
      const allowed = accept
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const ok = list.filter((f) => {
        const n = f.name.toLowerCase();
        const t = (f.type || '').toLowerCase();
        return allowed.some((a) => (a.startsWith('.') ? n.endsWith(a) : t === a));
      });
      if (!ok.length) {
        O.toast('Format non pris en charge. Attendu : ' + accept);
        return;
      }
      if (ok.length !== list.length) O.toast('Certains fichiers ont été ignorés (format non pris en charge).');
      opts.onFiles(ok);
    };

    input.addEventListener('change', () => {
      handle(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) =>
      el.addEventListener(ev, (e) => {
        e.preventDefault();
        el.classList.add('drag');
      })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      el.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'dragleave' && el.contains(e.relatedTarget)) return;
        el.classList.remove('drag');
      })
    );
    el.addEventListener('drop', (e) => handle(e.dataTransfer.files));
  };

  /* ---------- Liste de fichiers ---------- */
  O.renderFileList = function (container, files, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!files.length) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    files.forEach((f, idx) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.idx = idx;
      item.innerHTML = `
        <div class="fi-ico">${window.ICONS.filePdf}</div>
        <div class="fi-meta">
          <div class="fi-name">${O.escapeHtml(f.name)}</div>
          <div class="fi-size">${O.fmtSize(f.size)}${f.pages ? ' · ' + f.pages + ' page' + (f.pages > 1 ? 's' : '') : ''}</div>
        </div>
        <div class="fi-actions">
          ${opts.reorder ? `<button class="mini" data-act="up" title="Monter">▲</button><button class="mini" data-act="down" title="Descendre">▼</button>` : ''}
          <button class="mini" data-act="remove" title="Retirer">${window.ICONS.x}</button>
        </div>`;
      item.querySelector('[data-act="remove"]').addEventListener('click', (e) => {
        e.stopPropagation();
        files.splice(idx, 1);
        O.renderFileList(container, files, opts);
        if (opts.onChange) opts.onChange();
      });
      if (opts.reorder) {
        item.querySelector('[data-act="up"]').addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx > 0) {
            [files[idx - 1], files[idx]] = [files[idx], files[idx - 1]];
            O.renderFileList(container, files, opts);
            if (opts.onChange) opts.onChange();
          }
        });
        item.querySelector('[data-act="down"]').addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx < files.length - 1) {
            [files[idx + 1], files[idx]] = [files[idx], files[idx + 1]];
            O.renderFileList(container, files, opts);
            if (opts.onChange) opts.onChange();
          }
        });
      }
      container.appendChild(item);
    });
  };

  /* ---------- UI d'exécution ---------- */
  O.setBusy = function (btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> ${label || 'Traitement…'}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  };

  O.showError = function (container, message) {
    container.innerHTML = `<div class="alert alert-error">${window.ICONS.alert}<div>${O.escapeHtml(message)}</div></div>`;
    container.classList.remove('hidden');
  };

  O.showResult = function (container, title, detail, blob, filename) {
    container.innerHTML = `
      <h3>${window.ICONS.checkCircle} ${O.escapeHtml(title)}</h3>
      <p>${O.escapeHtml(detail)}</p>
      <button class="btn btn-primary" id="dl-btn">${window.ICONS.download} Télécharger ${O.escapeHtml(filename)}</button>`;
    container.classList.add('on');
    container.querySelector('#dl-btn').addEventListener('click', () => O.download(blob, filename));
  };

  /* ---------- Validation PDF ---------- */
  O.assertPdf = async function (file) {
    const buf = await O.readArrayBuffer(file);
    const { PDFDocument } = O.pdfLib();
    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: false });
      return { buf, pages: doc.getPageCount() };
    } catch (e) {
      if (/encrypt/i.test(e.message || '')) throw new Error(`« ${file.name} » est protégé par un mot de passe.`);
      throw new Error(`« ${file.name} » n’est pas un PDF valide ou est endommagé.`);
    }
  };
})();
