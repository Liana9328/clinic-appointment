import "./zod-openapi-setup";
import { z } from "zod";

const isoDateTimeWithOffset = z.iso.datetime({ offset: true });
const isoDateOrDateTime = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
]);

function refineFromNotAfterTo(
  value: { from?: string | undefined; to?: string | undefined },
  ctx: z.core.$RefinementCtx<unknown>,
) {
  if (value.from && value.to && Date.parse(value.from) > Date.parse(value.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "from must be less than or equal to to",
      path: ["from"],
    });
  }
}

const dateRangeShape = {
  from: isoDateOrDateTime.optional(),
  to: isoDateOrDateTime.optional(),
};

export const dateRangeSchema = z
  .object(dateRangeShape)
  .superRefine(refineFromNotAfterTo);

export const getAllAppointmentsSchema = z
  .object({
    ...dateRangeShape,
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page: z.coerce.number().int().min(1).default(1),
  })
  .superRefine(refineFromNotAfterTo);

export const createAppointmentSchema = z
  .object({
    clinicianId: z.string().min(1),
    patientId: z.string().min(1),
    start: isoDateTimeWithOffset,
    end: isoDateTimeWithOffset,
  })
  .superRefine((value, ctx) => {
    const startMs = Date.parse(value.start);
    const endMs = Date.parse(value.end);
    const now = Date.now();

    if (Number.isFinite(startMs) && startMs <= now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Appointment start time cannot be in the past",
        path: ["start"],
      });
    }

    if (startMs >= endMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start must be strictly before end",
        path: ["start"],
      });
    }
  })
  .openapi("CreateAppointmentBody", {
    example: {
      clinicianId: "c1",
      patientId: "p1",
      start: "2030-06-15T10:00:00.000Z",
      end: "2030-06-15T11:00:00.000Z",
    },
  });

/** `POST /appointments` */
export const postAppointmentRequestSchema = z.object({
  body: createAppointmentSchema,
});

/** `GET /clinicians/{id}/appointments` */
export const getClinicianAppointmentsRequestSchema = z.object({
  query: dateRangeSchema,
  params: z.object({
    id: z.string().min(1, "Clinician ID cannot be empty"),
  }),
});

/** `GET /appointments` */
export const getAllAppointmentsRequestSchema = z.object({
  query: getAllAppointmentsSchema,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ClinicianAppointmentsQuery = z.infer<typeof dateRangeSchema>;
export type GetAllAppointmentsQuery = z.infer<typeof getAllAppointmentsSchema>;
