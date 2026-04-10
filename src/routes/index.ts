import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { AppointmentController } from "../controllers/appointment-controller";
import { openApiSpec } from "../lib/openapi";
import { requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AppointmentRepository } from "../repositories/appointment-repository";
import { ClinicianRepository } from "../repositories/clinician-repository";
import { PatientRepository } from "../repositories/patient-repository";
import {
  getAllAppointmentsRequestSchema,
  getClinicianAppointmentsRequestSchema,
  postAppointmentRequestSchema,
} from "../schemas/appointment-schemas";
import { AppointmentService } from "../services/appointment-service";

const router = Router();

const appointmentService = new AppointmentService(
  new AppointmentRepository(),
  new ClinicianRepository(),
  new PatientRepository(),
);
const appointmentController = new AppointmentController(appointmentService);

router.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

router.post(
  "/appointments",
  requireRole("patient"),
  validate(postAppointmentRequestSchema),
  appointmentController.createAppointment,
);

router.get(
  "/clinicians/:id/appointments",
  requireRole("clinician"),
  validate(getClinicianAppointmentsRequestSchema),
  appointmentController.getClinicianAppointments,
);

router.get(
  "/appointments",
  requireRole("admin"),
  validate(getAllAppointmentsRequestSchema),
  appointmentController.getAppointments,
);

export { router };
