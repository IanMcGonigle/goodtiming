import {
  createDeletionChallengeResponse,
  getDeletionConfig,
  isMarketplaceDeletionNotification,
  NotificationBodyError,
  readNotificationBody,
} from '@/lib/server/ebay/marketplace-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers });
}

export function GET(request: Request): Response {
  const challenges = new URL(request.url).searchParams.getAll('challenge_code');
  if (challenges.length !== 1 || !challenges[0].trim()) {
    return errorResponse(400, 'A single nonempty challenge_code is required.');
  }
  try {
    const config = getDeletionConfig();
    return Response.json(
      {
        challengeResponse: createDeletionChallengeResponse(
          challenges[0],
          config,
        ),
      },
      { status: 200, headers },
    );
  } catch {
    return errorResponse(503, 'Notification endpoint is not configured.');
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    getDeletionConfig();
  } catch {
    return errorResponse(503, 'Notification endpoint is not configured.');
  }
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  ) {
    return errorResponse(415, 'Content-Type must be application/json.');
  }
  try {
    const body = await readNotificationBody(request);
    if (!isMarketplaceDeletionNotification(body)) {
      return errorResponse(
        400,
        'Invalid marketplace account deletion notification.',
      );
    }
    // Receipt only: no persistence, identifiers logged, sender authentication, or deletion.
    // Integrate verified, durable deletion handling before retaining any eBay user data.
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof NotificationBodyError) {
      return errorResponse(
        error.status,
        error.status === 413
          ? 'Notification body is too large.'
          : 'Invalid JSON notification body.',
      );
    }
    return errorResponse(500, 'Notification could not be received.');
  }
}
