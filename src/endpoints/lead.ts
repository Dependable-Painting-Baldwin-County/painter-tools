import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

// Local AppContext definition (replaces missing ../types)
export interface AppContext {
  env: {
    DB: {
      prepare: (query: string) => {
        bind: (...params: any[]) => {
          first: () => Promise<any>;
        };
      };
    };
  };
}

export class LeadFetch extends OpenAPIRoute {
  schema = {
    tags: ["Leads"],
    summary: "Fetch a single lead by id",
    request: {
      params: z.object({
        id: Str({ description: "Lead ID" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a single lead",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              lead: z.object({
                id: z.any(),
                name: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                zip: z.string().nullable().optional(),
                service: z.string().nullable().optional(),
                page: z.string().nullable().optional(),
                source: z.string().nullable().optional(),
                session: z.string().nullable().optional(),
                message: z.string().nullable().optional(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "Lead not found",
        content: {
          "application/json": {
            schema: z.object({ ok: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;

    const lead = await c.env.DB.prepare(
      `SELECT id, name, email, phone, city, zip, service, page, source, session, message
       FROM leads WHERE id = ?`
    ).bind(id).first();

    if (!lead) {
      return Response.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return { ok: true, lead };
  }
}
