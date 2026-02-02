/**
 * Extract YouTube video IDs from editor HTML (data-video-url, or iframe src).
 * Used at save time only – no parsing on frontend read (fast Prime Video page).
 */

const DATA_VIDEO_URL_REGEX = /data-video-url=["']([^"']*youtube[^"']*)["']/gi;
const IFRAME_SRC_REGEX = /<iframe[^>]+src=["']([^"']*youtube[^"']*)["']/gi;
const YOUTUBE_ID_REGEX = /(?:youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function extractVideoIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.trim().match(YOUTUBE_ID_REGEX);
  return m ? m[1] : null;
}

function collectUrls(html, regex) {
  const urls = [];
  let m;
  const re = new RegExp(regex.source, "gi");
  while ((m = re.exec(html)) !== null) {
    const url = (m[1] || "").trim();
    if (url && url.includes("youtube")) urls.push(url);
  }
  return urls;
}

/**
 * Extract unique YouTube video IDs and embed URLs from HTML content.
 * Matches data-video-url (editor insert) and iframe src (embed).
 * @param {string} html - Editor HTML (may be long)
 * @returns {{ videoId: string, embedUrl: string }[]}
 */
export function extractYoutubeVideosFromHtml(html) {
  if (!html || typeof html !== "string") return [];
  const seen = new Set();
  const out = [];
  const urls = [...collectUrls(html, DATA_VIDEO_URL_REGEX), ...collectUrls(html, IFRAME_SRC_REGEX)];
  for (const url of urls) {
    const videoId = extractVideoIdFromUrl(url);
    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      const embedUrl = url.startsWith("http") ? url : `https://www.youtube.com/embed/${videoId}`;
      out.push({ videoId, embedUrl });
    }
  }
  return out;
}
