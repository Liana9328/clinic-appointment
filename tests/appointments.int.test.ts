import request from "supertest";
import { prisma } from "../src/lib/prisma";
import { createApp } from "../src/app";

const app = createApp();

async function cleanTestDatabase(): Promise<void> {
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.clinician.deleteMany();
}

describe("Clinic appointment endpoints", () => {
  afterAll(async () => {
    await cleanTestDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  it("rejects appointment when start is in the past", async () => {
    const res = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        clinicianId: "c1",
        patientId: "p1",
        start: "2000-01-01T10:00:00.000Z",
        end: "2000-01-01T11:00:00.000Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      "Appointment start time cannot be in the past",
    );
  });

  it("rejects zero-length appointment (start equals end)", async () => {
    const res = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        clinicianId: "c1",
        patientId: "p1",
        start: "2028-06-01T10:00:00.000Z",
        end: "2028-06-01T10:00:00.000Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("start must be strictly before end");
  });

  it("rejects negative-length appointment (start after end)", async () => {
    const res = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        clinicianId: "c1",
        patientId: "p1",
        start: "2028-06-01T11:00:00.000Z",
        end: "2028-06-01T10:00:00.000Z",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("start must be strictly before end");
  });

  it("creates an appointment successfully", async () => {
    const res = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        clinicianId: "c1",
        patientId: "p1",
        start: "2028-01-01T10:00:00.000Z",
        end: "2028-01-01T11:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.clinicianId).toBe("c1");
    expect(res.body.patientId).toBe("p1");
  });

  it("rejects overlap appointment and allows touching appointment", async () => {
    const appointment = {
      clinicianId: "c2",
      patientId: "p2",
      start: "2028-01-01T10:00:00.000Z",
      end: "2028-01-01T11:00:00.000Z",
    };

    const first = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send(appointment);
    expect(first.status).toBe(201);

    const tounching_appointment = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        ...appointment,
        patientId: "p3",
        start: "2028-01-01T11:00:00.000Z",
        end: "2028-01-01T12:00:00.000Z",
      });
    expect(tounching_appointment.status).toBe(201);

    const overlap_appointment = await request(app)
      .post("/appointments")
      .set("X-Role", "patient")
      .send({
        ...appointment,
        patientId: "p4",
        start: "2028-01-01T10:30:00.000Z",
        end: "2028-01-01T11:30:00.000Z",
      });
    expect(overlap_appointment.status).toBe(409);
  });

  it("lists clinician upcoming appointments", async () => {
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c3",
      patientId: "p5",
      start: "2028-01-02T10:00:00.000Z",
      end: "2028-01-02T11:00:00.000Z",
    });

    const res = await request(app)
      .get("/clinicians/c3/appointments")
      .set("X-Role", "clinician");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clinicianId).toBe("c3");
    expect(res.body[0].patientId).toBe("p5");
    expect(res.body[0].startTime).toBe("2028-01-02T10:00:00.000Z");
    expect(res.body[0].endTime).toBe("2028-01-02T11:00:00.000Z");
  });

  it("lists clinician appointments filtered by from and to query params", async () => {
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c-range",
      patientId: "p-a",
      start: "2028-03-01T10:00:00.000Z",
      end: "2028-03-01T11:00:00.000Z",
    });
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c-range",
      patientId: "p-b",
      start: "2028-03-15T10:00:00.000Z",
      end: "2028-03-15T11:00:00.000Z",
    });

    const res = await request(app)
      .get("/clinicians/c-range/appointments")
      .query({ from: "2028-03-10", to: "2028-03-20" })
      .set("X-Role", "clinician");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].patientId).toBe("p-b");
    expect(res.body[0].startTime).toBe("2028-03-15T10:00:00.000Z");
  });

  it("filters appointments by admin date range", async () => {
    const entries = [
      ["2028-01-02T09:00:00.000Z", "2028-01-02T10:00:00.000Z", "p6"],
      ["2028-01-03T09:00:00.000Z", "2028-01-03T10:00:00.000Z", "p7"],
      ["2028-01-04T09:00:00.000Z", "2028-01-04T10:00:00.000Z", "p8"],
    ] as const;

    for (const [start, end, patientId] of entries) {
      await request(app).post("/appointments").set("X-Role", "patient").send({
        clinicianId: "c4",
        patientId,
        start,
        end,
      });
    }

    const res = await request(app)
      .get("/appointments?from=2028-01-03&limit=10&page=1")
      .set("X-Role", "admin");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].patientId).toBe("p7");
    expect(res.body[1].patientId).toBe("p8");
  });

  it("rejects admin list when from is after to", async () => {
    const res = await request(app)
      .get("/appointments")
      .query({ from: "2028-01-10", to: "2028-01-01" })
      .set("X-Role", "admin");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("from must be less than or equal to to");
  });

  it("lists all upcoming appointments for admin without from or to", async () => {
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c5",
      patientId: "p-x",
      start: "2025-07-01T09:00:00.000Z",
      end: "2025-07-01T10:00:00.000Z",
    });
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c6",
      patientId: "p-x",
      start: "2028-07-01T09:00:00.000Z",
      end: "2028-07-01T10:00:00.000Z",
    });
    await request(app).post("/appointments").set("X-Role", "patient").send({
      clinicianId: "c7",
      patientId: "p-y",
      start: "2028-07-02T09:00:00.000Z",
      end: "2028-07-02T10:00:00.000Z",
    });

    const res = await request(app).get("/appointments").set("X-Role", "admin");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].patientId).toBe("p-x");
    expect(res.body[1].patientId).toBe("p-y");
  });
});
