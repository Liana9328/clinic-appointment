import type { Appointment, Prisma } from "@prisma/client";
import { ConflictError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { parseQueryRangeBound } from "../lib/query-range-date";
import type {
  CreateAppointmentInput,
  GetAllAppointmentsQuery,
} from "../schemas/appointment-schemas";
import { AppointmentRepository } from "../repositories/appointment-repository";
import { ClinicianRepository } from "../repositories/clinician-repository";
import { PatientRepository } from "../repositories/patient-repository";

export class AppointmentService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clinicianRepository: ClinicianRepository,
    private readonly patientRepository: PatientRepository,
  ) {}

  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    const startTime = new Date(input.start);
    const endTime = new Date(input.end);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const clinician = await this.clinicianRepository.findById(
        tx,
        input.clinicianId,
      );
      if (!clinician) {
        await this.clinicianRepository.create(tx, input.clinicianId);
      }

      const patient = await this.patientRepository.findById(
        tx,
        input.patientId,
      );
      if (!patient) {
        await this.patientRepository.create(tx, input.patientId);
      }

      const overlap =
        await this.appointmentRepository.findOverlappingForClinician(
          tx,
          input.clinicianId,
          startTime,
          endTime,
        );

      if (overlap) {
        throw new ConflictError(
          "Appointment overlaps with existing clinician appointment",
        );
      }

      return this.appointmentRepository.create(tx, {
        clinicianId: input.clinicianId,
        patientId: input.patientId,
        startTime,
        endTime,
      });
    });
  }

  async getClinicianAppointments(
    clinicianId: string,
    query: { from?: string | undefined; to?: string | undefined },
  ): Promise<Appointment[]> {
    const filter = {
      ...(query.from ? { from: parseQueryRangeBound(query.from, "from") } : {}),
      ...(query.to ? { to: parseQueryRangeBound(query.to, "to") } : {}),
    };

    return this.appointmentRepository.getAppointmentsForClinician(
      prisma,
      clinicianId,
      new Date(),
      filter,
    );
  }

  async getAppointments(
    query: GetAllAppointmentsQuery,
  ): Promise<Appointment[]> {
    const filter = {
      ...(query.from ? { from: parseQueryRangeBound(query.from, "from") } : {}),
      ...(query.to ? { to: parseQueryRangeBound(query.to, "to") } : {}),
    };

    return this.appointmentRepository.getAllAppointments(
      prisma,
      new Date(),
      filter,
      {
        limit: query.limit,
        page: query.page,
      },
    );
  }
}
