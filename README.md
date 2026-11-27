# Outipro

**Plateforme gratuite d'outils PDF et numériques — 100 % dans votre navigateur.**

Outipro réunit seize outils pour manipuler vos documents PDF, vos images et vos fichiers Word, sans inscription, sans limite d'usage et sans jamais envoyer un seul octet sur un serveur. Chaque traitement s'exécute localement, dans l'onglet de votre navigateur, grâce aux bibliothèques JavaScript embarquées dans le projet.

---

## Pourquoi Outipro

La plupart des services de traitement PDF en ligne fonctionnent sur un principe simple : vous téléversez votre document sur un serveur distant, il y est traité, puis vous le téléchargez à nouveau. Ce modèle pose trois problèmes concrets. D'abord la confidentialité : un contrat, un bulletin de paie, une ordonnance ou un dossier médical quittent votre machine et sont copiés sur une infrastructure que vous ne contrôlez pas. Ensuite la dépendance : le service peut fermer, changer de modèle économique ou brider son offre gratuite du jour au lendemain. Enfin la latence : chaque opération dépend de la qualité de votre connexion montante, ce qui devient pénible avec un PDF de plusieurs dizaines de mégaoctets.

Outipro prend le problème à l'envers. L'application est un site statique : quelques fichiers HTML, CSS et JavaScript, plus six bibliothèques tierces vendorisées. Une fois la page chargée, plus aucun appel réseau n'est nécessaire pour traiter un fichier. Vous pouvez même couper votre connexion internet après l'ouverture de l'onglet : la fusion, la division, la compression ou la signature continueront de fonctionner normalement. Aucun compte, aucun cookie de suivi, aucune analytique, aucun stockage distant.

## Les outils

Seize outils sont répartis en cinq catégories. Tous acceptent le glisser-déposer et affichent un aperçu du résultat avant le téléchargement.

### Organiser

| Outil | Ce qu'il fait |
| --- | --- |
| **Fusionner des PDF** | Réunit plusieurs fichiers en un seul document. L'ordre des fichiers se réorganise avec des flèches avant la fusion. |
| **Diviser un PDF** | Découpe un document en fichiers séparés, soit une page par fichier, soit selon des plages personnalisées. Le résultat arrive dans une archive ZIP. |
| **Extraire des pages** | Conserve uniquement les pages sélectionnées, en cliquant sur les vignettes ou en saisissant « 1-3, 7, 10- ». |
| **Supprimer des pages** | Retire les pages indiquées et laisse le reste du document strictement identique. |
| **Pivoter un PDF** | Redresse un scan à l'envers, page par page ou sur l'ensemble du document, par pas de 90°. |

### Éditer

| Outil | Ce qu'il fait |
| --- | --- |
| **Numéroter les pages** | Ajoute une numérotation avec quatre formats (« 3 », « 3 / 12 », « Page 3 », « Page 3 sur 12 »), six positions et une taille réglable. |
| **Ajouter un filigrane** | Appose un texte en filigrane avec opacité, taille, couleur, inclinaison et répétition en mosaïque. Le texte reste vectoriel, donc net à l'impression. |
| **Signer un PDF** | Permet de tracer une signature à la souris ou au doigt, puis de la placer en cliquant sur l'aperçu de la page. Elle est appliquée à toutes les pages. |

### Convertir

| Outil | Ce qu'il fait |
| --- | --- |
| **PDF en JPG** | Rend chaque page en image JPG, avec qualité et résolution réglables. Un PDF multipage produit une archive ZIP. |
| **PDF en texte** | Extrait le contenu textuel, reconstruit les lignes et les paragraphes, et propose des séparateurs de page optionnels. |
| **Word en PDF** | Convertit un fichier `.docx` en PDF en conservant titres, paragraphes et listes à puces. |
| **Images en PDF** | Assemble des photos ou captures d'écran dans un PDF, avec format de page (A4, Letter ou ajusté), orientation et marges. |

### Optimiser

| Outil | Ce qu'il fait |
| --- | --- |
| **Compresser un PDF** | Allège un document en rééchantillonnant ses pages en images optimisées, avec trois niveaux : léger, équilibré et fort. Le gain de taille est affiché après traitement. |

### Images

| Outil | Ce qu'il fait |
| --- | --- |
| **Compresser une image** | Réduit le poids d'un JPG, PNG ou WebP avec un curseur de qualité et une largeur maximale, en affichant le gain obtenu. |
| **Convertir une image** | Convertit entre PNG, JPG et WebP. Le PNG préserve la transparence, le JPG aplatit sur fond blanc, le WebP combine les deux. |
| **Redimensionner une image** | Modifie largeur et hauteur, avec conservation du ratio par défaut. |

## Architecture technique

Le projet est volontairement dépourvu d'étape de build. Il n'y a ni bundler, ni transpileur, ni gestionnaire de paquets à l'exécution : le dépôt contient exactement ce qui est servi. Cette simplicité a un coût assumé — pas de modules ES, tout passe par un espace de noms global `window.OUTIPRO` — mais elle garantit qu'un clone du dépôt fonctionne immédiatement, et que le site peut être hébergé sur n'importe quel serveur de fichiers statiques.

```
outipro/
├── index.html                  # Coquille de l'application, chargement des scripts
├── assets/
│   ├── css/
│   │   └── style.css           # Design system complet (thèmes clair/sombre, responsive)
│   ├── js/
│   │   ├── icons.js            # Icônes SVG inline (style Lucide)
│   │   ├── core.js             # Espace de noms, utilitaires, PDF.js, dropzone
│   │   ├── tools-pdf.js        # Fusion, division, extraction, suppression
│   │   ├── tools-edit.js       # Pivot, numérotation, filigrane, signature
│   │   ├── tools-convert.js    # PDF→JPG, PDF→texte, compression, Word→PDF, images→PDF
│   │   ├── tools-image.js      # Compression, conversion, redimensionnement d'images
│   │   └── app.js              # Routeur SPA, rendu des pages, moteur de montage des outils
│   └── vendor/                 # Bibliothèques tierces, servies localement
│       ├── pdf-lib.min.js
│       ├── pdf.min.js
│       ├── pdf.worker.min.js
│       ├── jspdf.umd.min.js
│       ├── jszip.min.js
│       └── mammoth.browser.min.js
```

### Bibliothèques embarquées

**pdf-lib 1.17.1** est le cœur du traitement PDF. C'est lui qui charge les documents, copie les pages d'un fichier à l'autre, applique les rotations, dessine les numéros de page et les filigranes, et intègre les images PNG de signature. Il fonctionne entièrement en mémoire et produit un `Uint8Array` téléchargeable.

**PDF.js 3.11.174** sert à deux choses : rendre les vignettes de pages dans les sélecteurs visuels (extraire, supprimer, signer, pivoter) et extraire le texte pour l'outil PDF en texte. Le worker est servi localement, ce qui évite tout appel réseau au moment du rendu.

**jsPDF 2.5.1** génère les PDF produits par la compression, la conversion Word et l'assemblage d'images. Il est utilisé en mode rasterisation pour la compression : chaque page est rendue en canvas puis réencodée en JPEG à une échelle et une qualité choisies.

**JSZip 3.10.1** emballe les sorties multiples — division d'un PDF, conversion d'un PDF multipage en images — dans une archive unique.

**Mammoth 1.6.0** convertit les fichiers `.docx` en HTML sémantique, que l'application reparcourt ensuite pour reconstruire un PDF avec jsPDF, en gérant les titres, les paragraphes et les listes.

### Le modèle d'outil

Chaque outil est un objet poussé dans `window.OUTIPRO.tools` avec des métadonnées (`slug`, `name`, `desc`, `cat`, `icon`) et une méthode `run(api)`. Certains exposent aussi `mount(api)` pour l'initialisation et `onFiles(api)` pour réagir à l'arrivée de fichiers. L'objet `api` fournit tout ce dont un outil a besoin : la liste des fichiers, des raccourcis DOM, la gestion de la progression, l'affichage des erreurs et le rendu de la carte de résultat.

```js
O.tools.push({
  slug: 'mon-outil',
  name: 'Mon outil',
  desc: 'Description affichée sur la carte.',
  cat: 'Organiser',
  icon: 'merge',
  fields: `<label>…</label>`,          // champs de formulaire HTML
  onFiles(api) { /* réaction au dépôt de fichiers */ },
  async run(api) {
    const file = api.files[0];
    const { buf, pages } = await O.assertPdf(file);
    // … traitement …
    return { blob, filename: 'resultat.pdf', detail: '3 pages' };
  }
});
```

Ajouter un outil ne demande donc ni route, ni entrée de menu : le routeur `#/outil/{slug}` et les cartes de la page d'accueil sont générés à partir du registre.

### Routage et thème

La navigation repose sur un routeur par hash (`#/`, `#/outils`, `#/outil/{slug}`, `#/faq`, `#/a-propos`, `#/confidentialite`), sans dépendance externe. Le thème clair ou sombre se choisit dans l'en-tête, s'applique via l'attribut `html[data-theme]` et se mémorise dans `localStorage` sous la clé `outipro-theme`. Le design system s'appuie sur des variables CSS, ce qui rend la bascule instantanée et sans rechargement.

## Lancer le projet en local

Aucune installation n'est nécessaire. Un serveur de fichiers statiques suffit, car les scripts et le worker PDF.js sont chargés par URL relative et le protocole `file://` bloque certaines opérations.

```bash
git clone https://github.com/LUCKSON-NGOY/Outipro.git
cd Outipro
python3 -m http.server 8099
```

Ouvrez ensuite <http://localhost:8099>. Vous pouvez aussi utiliser `npx serve`, `php -S localhost:8099` ou n'importe quel serveur statique équivalent.

## Déploiement

Le site est entièrement statique. Il se déploie tel quel sur GitHub Pages, Netlify, Vercel, Cloudflare Pages ou un simple bucket S3. Il suffit de publier le contenu du dossier `outipro/` en conservant l'arborescence `assets/`, et de s'assurer que le fichier `assets/vendor/pdf.worker.min.js` est bien servi avec le type `application/javascript`.

## Confidentialité

Outipro ne collecte rien. Il n'y a ni compte utilisateur, ni cookie analytique, ni pixel de suivi, ni formulaire de contact transmis à un serveur. Les fichiers que vous déposez restent dans la mémoire de votre navigateur et sont libérés à la fermeture de l'onglet. La seule donnée persistée est votre préférence de thème, stockée localement dans `localStorage`. Les bibliothèques tierces sont servies depuis le domaine du site, jamais depuis un CDN externe, ce qui élimine toute fuite d'information vers un tiers au moment du chargement.

## Compatibilité

Outipro fonctionne sur les versions récentes de Chrome, Edge, Firefox et Safari, sur ordinateur comme sur mobile. Les outils s'appuient sur `Canvas`, `Blob`, `FileReader` et les API de téléchargement, disponibles partout depuis plusieurs années. La signature au doigt fonctionne sur écran tactile via les événements `touch`. Les très gros fichiers (plus de 100 Mo) peuvent dépasser la mémoire disponible sur les appareils mobiles d'entrée de gamme ; sur ordinateur, la limite pratique se situe plutôt autour de plusieurs centaines de mégaoctets.

## Limites connues

La compression de PDF fonctionne par rasterisation : les pages sont rendues en images, ce qui allège fortement les documents scannés ou riches en images, mais dégrade légèrement la netteté du texte et supprime la sélection de texte. C'est un compromis classique, assumé et expliqué dans l'interface. La conversion Word en PDF ne reprend pas les images du document d'origine et se concentre sur la structure textuelle. L'extraction de texte ne fait pas d'OCR : un PDF issu d'un scanner sans couche texte ne produira rien d'exploitable, et l'outil le signale explicitement plutôt que de rendre un fichier vide.

## Contact

Pour une question, un signalement de bug ou une suggestion d'outil : **sonoreluc30@gmail.com**. Merci de ne pas joindre vos documents — aucun fichier n'est nécessaire pour diagnostiquer un problème, et rien ne justifie de faire sortir un document sensible de votre appareil.

## Licence

Distribué sous licence MIT. Voir le fichier [LICENSE](LICENSE).
