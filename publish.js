/**
 * EK MacStore — Agent CM
 * Ce script est lancé automatiquement chaque jour par GitHub Actions.
 * Il vérifie si une publication est prévue aujourd'hui dans calendar.json,
 * et si oui, la publie sur la Page Facebook et le compte Instagram Business.
 *
 * Variables d'environnement requises (à définir comme "Secrets" GitHub) :
 *   PAGE_ACCESS_TOKEN            -> token d'accès longue durée de la Page Facebook
 *   FACEBOOK_PAGE_ID             -> ID de la Page Facebook "EK MacStore"
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID -> ID du compte Instagram Business "ekmacstore"
 *   GITHUB_REPOSITORY            -> fourni automatiquement par GitHub Actions
 *
 * Les images doivent être présentes dans /images avec le nom exact indiqué
 * dans calendar.json, et poussées (commit + push) sur la branche "main"
 * AVANT la date de publication prévue.
 */

const fs = require("fs");
const path = require("path");

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const IG_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

// En mode "dry run" (test), rien n'est réellement publié, on affiche juste ce qui le serait.
const DRY_RUN = process.env.DRY_RUN === "true";

function assertEnv() {
  const missing = [];
  if (!PAGE_ACCESS_TOKEN) missing.push("PAGE_ACCESS_TOKEN");
  if (!FACEBOOK_PAGE_ID) missing.push("FACEBOOK_PAGE_ID");
  if (!IG_BUSINESS_ID) missing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (missing.length) {
    console.error(
      `Variables manquantes: ${missing.join(", ")}. Ajoute-les dans Settings > Secrets and variables > Actions du dépôt GitHub.`
    );
    process.exit(1);
  }
}

function loadCalendar() {
  const raw = fs.readFileSync(path.join(__dirname, "calendar.json"), "utf-8");
  return JSON.parse(raw);
}

function daysBetween(dateA, dateB) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const b = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((b - a) / msPerDay);
}

function findTodaysPost(calendar, today) {
  const start = new Date(calendar.start_date + "T00:00:00Z");
  const offset = daysBetween(start, today);
  return calendar.posts.find((p) => p.day_offset === offset);
}

// Construit une URL publique "raw" vers l'image hébergée dans ce même dépôt GitHub.
function buildImageUrl(filename) {
  const repo = process.env.GITHUB_REPOSITORY; // ex: "monuser/ek-macstore-agent"
  const ref = process.env.GITHUB_REF_NAME || "main";
  if (!repo) {
    throw new Error(
      "GITHUB_REPOSITORY non défini — ce script est prévu pour tourner dans GitHub Actions."
    );
  }
  return `https://raw.githubusercontent.com/${repo}/${ref}/images/${encodeURIComponent(filename)}`;
}

function imageExistsLocally(filename) {
  return fs.existsSync(path.join(__dirname, "images", filename));
}

async function graphPost(endpoint, params) {
  const url = `${GRAPH_BASE}/${endpoint}`;
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Erreur API Graph (${endpoint}): ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

async function graphGet(endpoint, params) {
  const url = `${GRAPH_BASE}/${endpoint}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Erreur API Graph (${endpoint}): ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

async function publishToFacebook(post, imageUrl) {
  console.log(`→ Publication Facebook (${post.id})...`);
  if (DRY_RUN) {
    console.log("  [DRY RUN] Aurait publié sur Facebook avec l'image:", imageUrl);
    return;
  }
  if (imageUrl) {
    await graphPost(`${FACEBOOK_PAGE_ID}/photos`, {
      url: imageUrl,
      caption: post.caption,
      access_token: PAGE_ACCESS_TOKEN,
    });
  } else {
    await graphPost(`${FACEBOOK_PAGE_ID}/feed`, {
      message: post.caption,
      access_token: PAGE_ACCESS_TOKEN,
    });
  }
  console.log("  ✔ Publié sur Facebook.");
}

async function publishToInstagram(post, imageUrl) {
  console.log(`→ Publication Instagram (${post.id})...`);
  if (!imageUrl) {
    console.warn(
      `  ⚠ Pas d'image trouvée pour "${post.image_filename}" — Instagram exige une image, publication IGNORÉE. Ajoute la photo dans /images avant la prochaine exécution.`
    );
    return;
  }
  if (DRY_RUN) {
    console.log("  [DRY RUN] Aurait publié sur Instagram avec l'image:", imageUrl);
    return;
  }
  // 1. Créer le conteneur média
  const container = await graphPost(`${IG_BUSINESS_ID}/media`, {
    image_url: imageUrl,
    caption: post.caption,
    access_token: PAGE_ACCESS_TOKEN,
  });
  // 2. Publier le conteneur
  await graphPost(`${IG_BUSINESS_ID}/media_publish`, {
    creation_id: container.id,
    access_token: PAGE_ACCESS_TOKEN,
  });
  console.log("  ✔ Publié sur Instagram.");
}

async function main() {
  assertEnv();
  const calendar = loadCalendar();
  const today = new Date();
  const post = findTodaysPost(calendar, today);

  if (!post) {
    console.log("Aucune publication prévue aujourd'hui. Rien à faire.");
    return;
  }

  console.log(`Publication prévue aujourd'hui: ${post.id} (${post.pilier} — ${post.format})`);

  if (post.needs_review) {
    console.warn(
      `⚠ ATTENTION: ce post est marqué "needs_review" (${post.review_note || "à vérifier"}).`
    );
    console.warn("  Publication ANNULÉE par sécurité. Retire needs_review une fois le contenu validé.");
    return;
  }

  const hasImage = imageExistsLocally(post.image_filename);
  const imageUrl = hasImage ? buildImageUrl(post.image_filename) : null;

  if (!hasImage) {
    console.warn(
      `⚠ Image "${post.image_filename}" introuvable dans /images. Ajoute-la et pousse (git push) avant la date prévue.`
    );
  }

  if (post.platforms.includes("facebook")) {
    await publishToFacebook(post, imageUrl);
  }
  if (post.platforms.includes("instagram")) {
    await publishToInstagram(post, imageUrl);
  }

  console.log("Terminé.");
}

main().catch((err) => {
  console.error("Échec de la publication:", err.message);
  process.exit(1);
});
