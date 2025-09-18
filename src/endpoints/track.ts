import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

// Local definition since ../types is missing
export interface DB {
  prepare(sql: string): {
    bind(...params: any[]): {
      run(): Promise<any>;
    };
  };
}

export interface AppEnv {
  DB: DB;
}

export interface AppContext {
  env: AppEnv;
}

/**
 * Tracking endpoint
 * POST /api/track
 * - Records client-side events (click_call, form_start, visit, scroll, etc.)
 * - Persists to `lead_events` with day/hour for easy rollups
 */
export class TrackerCreate extends OpenAPIRoute {
  schema = {
    tags: ["Tracking"],
    summary: "Record a tracking event",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              ts: z.string().datetime().optional(),     // ISO timestamp
              type: z.string().min(1),                  // e.g. click_call | form_start | lead_submitted | visit | scroll
              page: z.string().optional(),
              service: z.string().optional(),
              source: z.string().optional(),            // utm_source/referrer label
              device: z.string().optional(),            // mobile | desktop, etc.
              city: z.string().optional(),
              country: z.string().optional(),
              zip: z.string().optional(),
              area: z.string().optional(),
              session: z.string().optional(),           // dp_sid / client id
              scroll_pct: z.number().min(0).max(100).optional()
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Event stored",
        content: {
          "application/json": {
            schema: z.object({ ok: z.literal(true) }),
          },
        },
      },
      "400": {
        description: "Invalid payload",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    // Validate payload
    const data = await this.getValidatedData<typeof this.schema>();
    const e = data.body;

    const ts = e.ts || new Date().toISOString();

    await c.env.DB.prepare(
      "INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct) " +
      "VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      ts, ts, ts,
      e.type,
      e.page ?? "/",
      e.service ?? null,
      e.source ?? null,
      e.device ?? null,
      e.city ?? null,
      e.country ?? null,
      e.zip ?? null,
      e.area ?? null,
      e.session ?? null,
      e.scroll_pct ?? 0
    )
    .run();

    return { ok: true };
  }
}
