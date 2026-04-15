export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { errorResponse } from "@/utils/apiResponse";

/**
 * Video file upload has been disabled. Use YouTube embed in the editor or host videos externally.
 */
export async function POST() {
  return errorResponse(
    "Video upload is disabled. Embed a YouTube URL instead, or host the video elsewhere and link to it.",
    410,
  );
}
