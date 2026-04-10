import type { Patient } from "@prisma/client";
import type { DbClient } from "../types/db";

export class PatientRepository {
  async findById(db: DbClient, id: string): Promise<Patient | null> {
    return db.patient.findUnique({ where: { id } });
  }

  async create(db: DbClient, id: string): Promise<Patient> {
    return db.patient.create({ data: { id } });
  }
}
