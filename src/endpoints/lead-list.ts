import { OpenAPIRoute, Num, Str } from "chanfana";
import { z } from "zod";
// Local AppContext type (previously imported from ../types which did not exist)
type AppContext = {
  env: {
    DB: {
      prepare(query: string): {
        bind(...params: unknown[]): {
          all(): Promise<{ results: any[] }>
        }
      }
    }
  }
};

export class LeadsList extends OpenAPIRoute {
  schema = {
    tags: ["Leads"],
    summary: "List leads with filters and pagination",
    request: {
      query: z.object({
        q: Str().optional(),
        source: Str().optional(),
        city: Str().optional(),
        limit: Num().int().min(1).max(200).default(50).optional(),
        offset: Num().int().min(0).default(0).optional(),
      }),
    },
    responses: {
      "200": {
        description: "List of leads",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              items: z.array(z.object({
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
              })),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const q = data.query;

    const filters: string[] = [];
    const args: unknown[] = [];

    if (q.source) { filters.push("source = ?"); args.push(q.source); }
    if (q.city)   { filters.push("city = ?");   args.push(q.city);   }
    if (q.q) {
      filters.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      args.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const limit = Math.min((q.limit ?? 50), 200);
    const offset = q.offset ?? 0;

    const { results } = await c.env.DB.prepare(
      `SELECT id, name, email, phone, city, zip, service, page, source, session, message
       FROM leads ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    ).bind(...args, limit, offset).all();

    return { ok: true, items: results };
  }
}
