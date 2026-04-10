import type { Appointment, Prisma } from "@prisma/client";
import { ConflictError } from "../../src/errors/app-error";
import { prisma } from "../../src/lib/prisma";
import { AppointmentRepository } from "../../src/repositories/appointment-repository";
import { ClinicianRepository } from "../../src/repositories/clinician-repository";
import { PatientRepository } from "../../src/repositories/patient-repository";
import { AppointmentService } from "../../src/services/appointment-service";

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

function sampleAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt-1",
    clinicianId: "c1",
    patientId: "p1",
    startTime: new Date("2099-06-01T10:00:00.000Z"),
    endTime: new Date("2099-06-01T11:00:00.000Z"),
    createdAt: new Date("2099-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AppointmentService", () => {
  const mockTx = {} as Prisma.TransactionClient;

  let appointmentRepository: {
    create: jest.Mock;
    findOverlappingForClinician: jest.Mock;
    getAppointmentsForClinician: jest.Mock;
    getAllAppointments: jest.Mock;
  };
  let clinicianRepository: {
    findById: jest.Mock;
    create: jest.Mock;
  };
  let patientRepository: {
    findById: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentRepository = {
      create: jest.fn(),
      findOverlappingForClinician: jest.fn(),
      getAppointmentsForClinician: jest.fn(),
      getAllAppointments: jest.fn(),
    };
    clinicianRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    };
    patientRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    };
  });

  function service() {
    return new AppointmentService(
      appointmentRepository as unknown as AppointmentRepository,
      clinicianRepository as unknown as ClinicianRepository,
      patientRepository as unknown as PatientRepository,
    );
  }

  describe("createAppointment", () => {
    const input = {
      clinicianId: "c1",
      patientId: "p1",
      start: "2099-06-01T10:00:00.000Z",
      end: "2099-06-01T11:00:00.000Z",
    };

    it("creates missing clinician and patient then creates appointment", async () => {
      const created = sampleAppointment();
      clinicianRepository.findById.mockResolvedValue(null);
      clinicianRepository.create.mockResolvedValue({
        id: "c1",
        createdAt: new Date(),
      });
      patientRepository.findById.mockResolvedValue(null);
      patientRepository.create.mockResolvedValue({
        id: "p1",
        createdAt: new Date(),
      });
      appointmentRepository.findOverlappingForClinician.mockResolvedValue(null);
      appointmentRepository.create.mockResolvedValue(created);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (t: typeof mockTx) => Promise<Appointment>) => fn(mockTx),
      );

      await expect(service().createAppointment(input)).resolves.toEqual(
        created,
      );

      expect(clinicianRepository.findById).toHaveBeenCalledWith(mockTx, "c1");
      expect(clinicianRepository.create).toHaveBeenCalledWith(mockTx, "c1");
      expect(patientRepository.findById).toHaveBeenCalledWith(mockTx, "p1");
      expect(patientRepository.create).toHaveBeenCalledWith(mockTx, "p1");
      expect(
        appointmentRepository.findOverlappingForClinician,
      ).toHaveBeenCalledWith(
        mockTx,
        "c1",
        new Date(input.start),
        new Date(input.end),
      );
      expect(appointmentRepository.create).toHaveBeenCalledWith(mockTx, {
        clinicianId: "c1",
        patientId: "p1",
        startTime: new Date(input.start),
        endTime: new Date(input.end),
      });
    });

    it("skips create when clinician and patient already exist", async () => {
      const created = sampleAppointment();
      clinicianRepository.findById.mockResolvedValue({
        id: "c1",
        createdAt: new Date(),
      });
      patientRepository.findById.mockResolvedValue({
        id: "p1",
        createdAt: new Date(),
      });
      appointmentRepository.findOverlappingForClinician.mockResolvedValue(null);
      appointmentRepository.create.mockResolvedValue(created);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (t: typeof mockTx) => Promise<Appointment>) => fn(mockTx),
      );

      await service().createAppointment(input);

      expect(clinicianRepository.create).not.toHaveBeenCalled();
      expect(patientRepository.create).not.toHaveBeenCalled();
    });

    it("throws ConflictError when an overlapping appointment exists", async () => {
      clinicianRepository.findById.mockResolvedValue({
        id: "c1",
        createdAt: new Date(),
      });
      patientRepository.findById.mockResolvedValue({
        id: "p1",
        createdAt: new Date(),
      });
      appointmentRepository.findOverlappingForClinician.mockResolvedValue(
        sampleAppointment({ id: "existing" }),
      );

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (fn: (t: typeof mockTx) => Promise<Appointment>) => fn(mockTx),
      );

      await expect(service().createAppointment(input)).rejects.toThrow(
        ConflictError,
      );
      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getClinicianAppointments", () => {
    it("parses date-only bounds and delegates to repository", async () => {
      const list = [sampleAppointment()];
      appointmentRepository.getAppointmentsForClinician.mockResolvedValue(list);

      const result = await service().getClinicianAppointments("c1", {
        from: "2099-05-10",
        to: "2099-05-11",
      });

      expect(result).toEqual(list);
      expect(
        appointmentRepository.getAppointmentsForClinician,
      ).toHaveBeenCalledWith(prisma, "c1", expect.any(Date), {
        from: new Date(Date.UTC(2099, 4, 10, 0, 0, 0, 0)),
        to: new Date(Date.UTC(2099, 4, 11, 23, 59, 59, 999)),
      });
    });
  });

  describe("getAppointments", () => {
    it("passes pagination and parsed range to repository", async () => {
      appointmentRepository.getAllAppointments.mockResolvedValue([]);

      await service().getAppointments({
        from: "2099-08-01",
        to: "2099-08-01",
        limit: 15,
        page: 2,
      });

      expect(appointmentRepository.getAllAppointments).toHaveBeenCalledWith(
        prisma,
        expect.any(Date),
        {
          from: new Date(Date.UTC(2099, 7, 1, 0, 0, 0, 0)),
          to: new Date(Date.UTC(2099, 7, 1, 23, 59, 59, 999)),
        },
        { limit: 15, page: 2 },
      );
    });
  });
});
