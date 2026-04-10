import fs from "node:fs";
import path from "node:path";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  createAppointmentSchema,
  dateRangeSchema,
  getAllAppointmentsSchema,
} from "../src/schemas/appointment-schemas";

const roleDescription =
  "Simulated role for this challenge (not production auth). Minimum role: **patient** (create), **clinician** (clinician list), or **admin** (admin list).";

const xRoleHeader = z.object({
  "X-Role": z.enum(["patient", "clinician", "admin"]).openapi({
    description: roleDescription,
    param: { name: "X-Role", in: "header", required: true },
  }),
});

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "post",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "Create appointment",
  description:
    "Minimum **X-Role**: patient. JSON body: ISO 8601 datetimes **with offset** (e.g. `2030-06-15T10:00:00.000Z` or `2030-06-15T12:00:00+02:00`); start must be in the future and strictly before end.",
  request: {
    headers: xRoleHeader,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createAppointmentSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Created" },
    400: { description: "Bad Request" },
    403: { description: "Missing/invalid X-Role or insufficient role" },
    409: { description: "Conflict" },
  },
});

registry.registerPath({
  method: "get",
  path: "/clinicians/{id}/appointments",
  tags: ["Appointments"],
  summary: "Get clinician upcoming appointments",
  description:
    "Minimum **X-Role**: clinician. Optional query `from` / `to`: calendar date (`YYYY-MM-DD`, e.g. `2028-03-10`) or ISO 8601 datetime with offset (e.g. `2028-03-15T14:30:00-05:00`).",
  request: {
    headers: xRoleHeader,
    params: z.object({
      id: z
        .string()
        .min(1)
        .openapi({
          param: { name: "id", in: "path", required: true },
          description: "Clinician id",
        }),
    }),
    query: dateRangeSchema,
  },
  responses: {
    200: { description: "OK" },
    400: { description: "Bad Request (e.g. from after to)" },
    403: { description: "Missing/invalid X-Role or insufficient role" },
  },
});

registry.registerPath({
  method: "get",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "Get all upcoming appointments (admin)",
  description:
    "Minimum **X-Role**: **admin**. Optional `from` / `to` use the same formats as clinician list: `YYYY-MM-DD` or ISO datetime with offset (e.g. `2028-01-03T00:00:00+01:00`). Defaults: limit 20, page 1.",
  request: {
    headers: xRoleHeader,
    query: getAllAppointmentsSchema,
  },
  responses: {
    200: { description: "OK" },
    400: { description: "Bad Request (e.g. from after to)" },
    403: { description: "Missing/invalid X-Role or insufficient role" },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const doc = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Clinic Appointment API",
    version: "1.0.0",
    description:
      "REST API for managing clinic appointments. **X-Role** simulates RBAC for this challenge; it is not real authentication.",
  },
  servers: [{ url: "http://localhost:3000" }],
});

const outPath = path.join(process.cwd(), "src", "lib", "swagger-output.json");
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
