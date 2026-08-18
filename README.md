# Agent CM — EK MacStore

Ce projet publie automatiquement les posts Facebook et Instagram d'EK MacStore, selon le calendrier défini dans `calendar.json`, en s'appuyant sur ta feuille de route (stratégie CM).

## Comment ça marche

1. Chaque jour à 09h00 (heure d'Abidjan), GitHub exécute automatiquement `publish.js`.
2. Le script regarde si une publication est prévue aujourd'hui dans `calendar.json`.
3. Si oui, et si l'image correspondante est présente dans `/images`, il publie sur la Page Facebook **et** le compte Instagram Business d'EK MacStore.
4. Si un post est marqué `"needs_review": true`, il n'est **jamais publié automatiquement** — c'est une sécurité pour les contenus qui doivent être relus par un humain (ex: témoignages clients, promos à confirmer).
## Mise en route (une seule fois)

### 1. Créer le dépôt GitHub
1. Va sur [github.com/new](https://github.com/new)
2. Nom du dépôt : `ek-macstore-agent` (ou ce que tu veux)
3. Visibilité : **Public** (nécessaire pour que Instagram puisse lire les images — le contenu est de toute façon destiné à devenir public sur tes réseaux)
4. Crée le dépôt, puis uploade tous les fichiers de ce dossier dedans (bouton "uploading an existing file" sur GitHub, ou via `git push` si tu es à l'aise avec Git)

### 2. Ajouter les secrets (les clés d'accès)
Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**, ajoute ces 3 secrets :

| Nom du secret | Valeur |
|---|---|
| `PAGE_ACCESS_TOKEN` | Le token longue durée généré via l'Explorateur d'API Graph |
| `FACEBOOK_PAGE_ID` | `510531769062567` |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | `17841423642859934` |

⚠️ Ne mets JAMAIS ces valeurs directement dans le code ou dans `calendar.json` — uniquement dans les Secrets GitHub, qui restent privés.

### 3. Activer les GitHub Actions
Va dans l'onglet **Actions** du dépôt, GitHub te proposera d'activer les workflows — clique sur "I understand my workflows, go ahead and enable them".

### 4. Ajouter les photos
Dans `/images`, ajoute tes photos produits avec les noms de fichiers exacts listés dans `calendar.json` (voir `images/README.md`).

### 5. Tester avant de compter dessus
Dans l'onglet **Actions → Publication automatique EK MacStore → Run workflow**, lance le workflow manuellement avec "Mode test" coché — ça te montre ce qui *aurait* été publié, sans rien envoyer réellement.

## Changer la date de départ du calendrier
Ouvre `calendar.json` et modifie `"start_date"` (doit être un lundi) — tout le calendrier de 4 semaines se recalcule automatiquement à partir de cette date.

## Aller plus loin (non inclus dans cette v1)
- Les **Stories** (mentionnées dans la feuille de route) ne sont pas automatisées ici — elles utilisent une API différente et expirent en 24h.
- Le **plan Meta Ads** (boost à 5 000-7 000 FCFA les week-ends) reste manuel — c'est une action à faire toi-même dans le Gestionnaire de publicités Meta, en boostant le post qui a le mieux performé organiquement (voir section 6 de ta feuille de route).
- Les réponses WhatsApp pré-rédigées (section 8 de la feuille de route) sont à enregistrer directement dans WhatsApp Business → Paramètres → Outils professionnels → Réponses rapides.
