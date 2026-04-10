import type { Request, Response } from "express";
import type { AppointmentService } from "../services/appointment-service";
import type {
  ClinicianAppointmentsQuery,
  CreateAppointmentInput,
  GetAllAppointmentsQuery,
} from "../schemas/appointment-schemas";

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  createAppointment = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.createAppointment(
      req.validated!.body as CreateAppointmentInput,
    );
    res.status(201).json(appointment);
  };

  getClinicianAppointments = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const appointments = await this.appointmentService.getClinicianAppointments(
      (req.validated!.params as { id: string }).id,
      req.validated!.query as ClinicianAppointmentsQuery,
    );
    res.status(200).json(appointments);
  };

  getAppointments = async (req: Request, res: Response): Promise<void> => {
    const appointments = await this.appointmentService.getAppointments(
      req.validated!.query as GetAllAppointmentsQuery,
    );
    res.status(200).json(appointments);
  };
}
