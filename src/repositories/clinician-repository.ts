import type { Clinician } from "@prisma/client";
import type { DbClient } from "../types/db";

export class ClinicianRepository {
  async findById(db: DbClient, id: string): Promise<Clinician | null> {
    return db.clinician.findUnique({ where: { id } });
  }

  async create(db: DbClient, id: string): Promise<Clinician> {
    return db.clinician.create({ data: { id } });
  }
}
