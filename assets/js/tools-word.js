/* Outipro — conversion PDF vers Word (.docx) : extraction du texte et génération OOXML côté navigateur */
(function () {
  const O = window.OUTIPRO;
  const I = window.ICONS;

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  /* Regroupe les fragments de texte de PDF.js en lignes visuelles */
  function toLines(items) {
    const frags = items
      .filter((it) => it.str && it.str.trim() !== '' && it.transform)
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
        h: Math.abs(it.transform[3]) || it.height || 10
      }))
      .sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));

    const lines = [];
    frags.forEach((f) => {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - f.y) <= Math.max(2, Math.min(last.h, f.h) * 0.55)) {
        last.frags.push(f);
      } else {
        lines.push({ y: f.y, h: f.h, frags: [f] });
      }
    });

    return lines.map((line) => {
      line.frags.sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = null;
      line.frags.forEach((f) => {
        if (prevEnd !== null) {
          const gap = f.x - prevEnd;
          if (gap > Math.max(1.2, f.h * 0.16)) text += ' ';
        }
        text += f.str;
        prevEnd = f.x + f.w;
      });
      const height = line.frags.reduce((m, f) => Math.max(m, f.h), 0);
      return { text: text.replace(/\s+/g, ' ').trim(), y: line.y, h: height };
    }).filter((l) => l.text);
  }

  /* Assemble les lignes en paragraphes selon les écarts verticaux */
  function toParagraphs(lines, merge) {
    const out = [];
    if (!merge) {
      lines.forEach((l) => out.push({ text: l.text, h: l.h }));
      return out;
    }
    let current = null;
    lines.forEach((line, i) => {
      const prev = lines[i - 1];
      let gap = 0;
      if (prev) gap = Math.abs(prev.y - line.y) - Math.max(prev.h, line.h) * 0.6;
      const threshold = Math.max(3, line.h * 0.9);
      const startsNew = !prev || gap > threshold;
      if (startsNew || !current) {
        current = { text: line.text, h: line.h };
        out.push(current);
      } else {
        const hyphen = /[-–—]$/.test(current.text);
        current.text = hyphen ? current.text.replace(/[-–—]$/, '') + line.text : current.text + ' ' + line.text;
        current.h = Math.max(current.h, line.h);
      }
    });
    return out;
  }

  function paraXml(p, bodySize) {
    const isTitle = p.h > bodySize * 1.28;
    const sz = Math.round(Math.min(40, Math.max(18, p.h * 2)));
    const rPr = isTitle ? `<w:rPr><w:b/><w:sz w:val="${Math.min(40, sz)}"/></w:rPr>` : '';
    const pPr = `<w:pPr><w:spacing w:before="${isTitle ? 240 : 0}" w:after="${isTitle ? 120 : 100}" w:line="276" w:lineRule="auto"/>${isTitle ? '<w:keepNext/>' : ''}</w:pPr>`;
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(p.text)}</w:t></w:r></w:p>`;
  }

  const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  function documentXml(pages, bodySize) {
    const parts = [];
    pages.forEach((paras, idx) => {
      if (idx > 0) parts.push(PAGE_BREAK);
      if (!paras.length) parts.push('<w:p/>');
      paras.forEach((p) => parts.push(paraXml(p, bodySize)));
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${parts.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
  }

  const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;

  const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const CORE = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Document converti</dc:title><dc:creator>Outipro</dc:creator><cp:lastModifiedBy>Outipro</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now()}</dcterms:modified>
</cp:coreProperties>`;

  const APP = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Outipro</Application><AppVersion>1.0</AppVersion>
</Properties>`;

  O.tools.push({
    slug: 'pdf-en-word',
    name: 'PDF en Word',
    short: 'Transformez un PDF en document Word (.docx) modifiable, sans perdre le texte.',
    desc: 'Extrayez le texte de votre PDF et obtenez un fichier Word (.docx) que vous pouvez modifier, corriger ou compléter. Les paragraphes et les titres sont reconstitués automatiquement, et chaque page du PDF devient une page du document Word.',
    cat: 'Convertir',
    icon: 'fileWord',
    color: 'c-sky',
    accept: '.pdf',
    multiple: false,
    action: 'Convertir en Word',
    dropTitle: 'Déposez votre PDF ici',
    dropSub: 'ou cliquez pour sélectionner un fichier',
    hint: 'PDF texte · sortie .docx modifiable',
    fields: `
      <div class="field">
        <label for="mode">Reconstitution du texte</label>
        <select class="input" data-opt="mode" id="mode">
          <option value="paragraphs">Paragraphes (recommandé)</option>
          <option value="lines">Une ligne par paragraphe</option>
        </select>
        <div class="help">Le mode « paragraphes » recolle les lignes coupées par la mise en page du PDF.</div>
      </div>
      <div class="field">
        <label for="breaks">Sauts de page</label>
        <select class="input" data-opt="breaks" id="breaks">
          <option value="keep">Conserver une page Word par page PDF</option>
          <option value="flow">Enchaîner le texte sans saut de page</option>
        </select>
      </div>`,
    run: async (api) => {
      const JSZip = window.JSZip;
      const file = api.files[0];
      const mode = api.val('mode') || 'paragraphs';
      const breaks = api.val('breaks') || 'keep';

      let doc;
      try {
        doc = await O.openPdfDoc(await O.readArrayBuffer(file));
      } catch (e) {
        throw new Error('Impossible d’ouvrir ce PDF : fichier protégé ou endommagé.');
      }

      const total = doc.numPages;
      const pages = [];
      const heights = [];
      let chars = 0;

      for (let p = 1; p <= total; p++) {
        api.setProgress(8 + (p / total) * 72, `Extraction du texte ${p}/${total}…`);
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const lines = toLines(content.items);
        lines.forEach((l) => heights.push(l.h));
        lines.forEach((l) => (chars += l.text.length));
        pages.push(lines);
      }

      if (chars < 8) {
        throw new Error('Aucun texte détecté dans ce PDF. Il s’agit probablement d’un document scanné : la reconnaissance de caractères (OCR) n’est pas disponible sur Outipro.');
      }

      heights.sort((a, b) => a - b);
      const bodySize = heights.length ? heights[Math.floor(heights.length / 2)] : 11;

      api.setProgress(86, 'Construction du document Word…');
      const finalPages = pages.map((lines) => toParagraphs(lines, mode === 'paragraphs'));
      const body = breaks === 'keep' ? finalPages : [finalPages.flat()];

      const zip = new JSZip();
      zip.file('[Content_Types].xml', CONTENT_TYPES);
      zip.file('_rels/.rels', ROOT_RELS);
      zip.file('word/document.xml', documentXml(body, bodySize));
      zip.file('word/_rels/document.xml.rels', DOC_RELS);
      zip.file('word/styles.xml', STYLES);
      zip.file('docProps/core.xml', CORE());
      zip.file('docProps/app.xml', APP);

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const paras = body.reduce((n, page) => n + page.length, 0);
      return {
        blob,
        filename: `${O.baseName(file.name)}.docx`,
        detail: `${total} page${total > 1 ? 's' : ''} · ${paras} paragraphe${paras > 1 ? 's' : ''} · ${O.fmtSize(blob.size)}`
      };
    }
  });
})();
