import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
/**
 * Local AppContext type added because ../types module was missing.
 * Adjust this definition to match your real runtime context.
 */
type AppContext = {
  env: {
    DB: {
      prepare: (sql: string) => {
        bind: (...params: any[]) => {
          run: () => Promise<{ meta: { last_row_id: number } }>
        }
      }
    }
  }
};

export class EstimateCreate extends OpenAPIRoute {
  schema = {
    tags: ["Leads"],
    summary: "Create a lead from the contact form",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string().min(1).max(120).optional(),
              email: z.string().email().optional(),
              phone: z.string().min(3).max(40).optional(),
              city: z.string().max(80).optional(),
              zip: z.string().max(20).optional(),
              service: z.string().max(80).optional(),
              message: z.string().max(2000).optional(),
              page: z.string().default("/contact-form").optional(),
              source: z.string().max(120).optional(),
              session: z.string().max(120).optional()
            }).refine((v) => !!(v.phone || v.email), {
              message: "phone or email required"
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Lead created",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              lead_id: z.string()
            }),
          },
        },
      },
      "400": {
        description: "Invalid payload",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    // Validate request
    const data = await this.getValidatedData<typeof this.schema>();
    const b = data.body;

    // Insert into leads
    // Adjust the SQL/columns if your migration differs.
    const res = await c.env.DB.prepare(
      `INSERT INTO leads
       (name,email,phone,city,zip,service,page,session,source,message)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        b.name ?? null,
        b.email ?? null,
        b.phone ?? null,
        b.city ?? null,
        b.zip ?? null,
        b.service ?? null,
        b.page ?? "/contact-form",
        b.session ?? null,
        b.source ?? "",
        b.message ?? null
      )
      .run();

    const leadId = String(res.meta.last_row_id);

    // Log event for attribution
    const ts = new Date().toISOString();
    await c.env.DB.prepare(
      "INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct) " +
      "VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        ts, ts, ts,
        "lead_submitted",
        b.page ?? "/contact-form",
        b.service ?? null,
        b.source ?? "",
        null, // device
        b.city ?? null,
        null, // country
        b.zip ?? null,
        null, // area
        b.session ?? null,
        0
      )
      .run();

    return {
      ok: true,
      lead_id: leadId,
    };
  }
}
