import { runtime, errorResponse, readBody, response } from '../_shared/square-runtime.ts';
import { record, string, verifyWebhook } from '../_shared/square-security.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed.' });
  try {
    const service = runtime();
    const raw = await readBody(request, 1048576);
    if (
      !(await verifyWebhook(
        raw,
        request.headers.get('x-square-hmacsha256-signature'),
        service.config.webhookUrl,
        service.config.webhookKey,
      ))
    )
      return response(request, 401, { error: 'Invalid signature.' });
    const event = record(JSON.parse(raw));
    const data = record(event.data ?? {});
    const occurredAt = new Date(string(event.created_at, 50)).toISOString();
    const inbox = {
      event_id: string(event.event_id, 200),
      event_type: string(event.type, 100),
      merchant_id: string(event.merchant_id, 100),
      object_id: typeof data.id === 'string' ? string(data.id, 200) : null,
      occurred_at: occurredAt,
      signature_verified: true,
    };
    await service.checked(
      service.db
        .from('square_webhook_inbox')
        .upsert(inbox, { onConflict: 'event_id', ignoreDuplicates: true }),
    );
    await service.webhookEvent(inbox);
    return response(request, 200, { received: true });
  } catch (error) {
    return errorResponse(request, error);
  }
});
