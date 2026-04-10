import type { Appointment } from "@prisma/client";
import type { DbClient } from "../types/db";

type AppointmentFilter = {
  from?: Date;
  to?: Date;
};

function buildStartTimeFilter(now: Date, filter: AppointmentFilter) {
  return {
    gte: filter.from ?? now,
    ...(filter.to ? { lte: filter.to } : {}),
  };
}

export class AppointmentRepository {
  async create(
    db: DbClient,
    input: {
      clinicianId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<Appointment> {
    return db.appointment.create({ data: input });
  }

  async findOverlappingForClinician(
    db: DbClient,
    clinicianId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Appointment | null> {
    return db.appointment.findFirst({
      where: {
        clinicianId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  async getAppointmentsForClinician(
    db: DbClient,
    clinicianId: string,
    now: Date,
    filter: AppointmentFilter,
  ): Promise<Appointment[]> {
    return db.appointment.findMany({
      where: {
        clinicianId,
        startTime: buildStartTimeFilter(now, filter),
      },
      orderBy: { startTime: "asc" },
    });
  }

  async getAllAppointments(
    db: DbClient,
    now: Date,
    filter: AppointmentFilter,
    pagination: { limit: number; page: number },
  ): Promise<Appointment[]> {
    return db.appointment.findMany({
      where: {
        startTime: buildStartTimeFilter(now, filter),
      },
      orderBy: { startTime: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });
  }
}
