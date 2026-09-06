// Idempotent seed. Safe to run on every deploy — uses upserts and
// findFirst+create for models with nullable composite uniques (which
// Prisma's upsert-by-compound-unique doesn't handle when a field is null).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  password: string,
  role: "ADMIN" | "USER",
  name: string
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { role, name }, // don't reset password on every deploy
    create: { email, passwordHash, role, name },
  });
}

async function main() {
  console.log("Seeding users…");
  await upsertUser(
    process.env.SEED_ADMIN_EMAIL ?? "admin@hospital.local",
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin2026",
    "ADMIN",
    "Hospital Admin"
  );
  await upsertUser(
    process.env.SEED_USER_EMAIL ?? "user@hospital.local",
    process.env.SEED_USER_PASSWORD ?? "ChangeMe!User2026",
    "USER",
    "Hospital Staff"
  );

  console.log("Seeding reference data…");
  const majors = [
    "Land & Building",
    "Plant & Machinery",
    "Furniture & Fixture",
    "IT Hardware & software",
    "Office Equipment",
    "Capital Work in Progress",
  ];
  for (const m of majors) {
    await prisma.majorCategory.upsert({
      where: { name: m },
      update: {},
      create: { name: m },
    });
  }
  const finals = [
    ["Building", "Land & Building"],
    ["Hospital Equipment", "Plant & Machinery"],
    ["A C Plant/Air Plant", "Plant & Machinery"],
    ["Electrical Installation", "Plant & Machinery"],
    ["Electric Generator", "Plant & Machinery"],
    ["Office Furniture", "Furniture & Fixture"],
    ["Software", "IT Hardware & software"],
    ["Others", "Office Equipment"],
    ["CWIP", "Capital Work in Progress"],
  ] as const;
  for (const [n, majorName] of finals) {
    const major = await prisma.majorCategory.findUnique({ where: { name: majorName } });
    if (!major) continue;
    const existing = await prisma.finalCategory.findFirst({
      where: { name: n, majorCategoryId: major.id },
    });
    if (!existing) {
      await prisma.finalCategory.create({
        data: { name: n, majorCategoryId: major.id },
      });
    }
  }

  const departments = ["Biomedical", "Engineering", "F&F", "IT", "Security"];
  for (const d of departments) {
    await prisma.department.upsert({
      where: { name: d },
      update: {},
      create: { name: d },
    });
  }

  console.log("Seeding demo location hierarchy (clearly labelled)…");
  const existingBuilding = await prisma.building.findFirst({ where: { code: "DEMO" } });
  const building =
    existingBuilding ??
    (await prisma.building.create({
      data: {
        // Placeholder — the admin should rename this to the real
        // building (e.g. "RBH Main Building") after first login and add
        // real floors + rooms before assigning assets.
        name: "Rukmani Birla Hospital (please rename)",
        code: "RBH-MAIN",
      },
    }));

  async function ensureFloor(name: string, num: number) {
    return prisma.floor.upsert({
      where: { buildingId_floorNumber: { buildingId: building.id, floorNumber: num } },
      update: { name, planWidth: 1800, planHeight: 1200 },
      create: {
        buildingId: building.id,
        name,
        floorNumber: num,
        levelIndex: num,
        planWidth: 1800,
        planHeight: 1200,
      },
    });
  }
  const g = await ensureFloor("Ground Floor", 0);
  const f1 = await ensureFloor("First Floor", 1);

  async function ensureRoom(
    floorId: string,
    code: string,
    name: string,
    type: string,
    points: { x: number; y: number }[]
  ) {
    return prisma.room.upsert({
      where: { floorId_code: { floorId, code } },
      update: { name, type, geometry: JSON.stringify({ points }) },
      create: { floorId, code, name, type, geometry: JSON.stringify({ points }) },
    });
  }
  await ensureRoom(g.id, "G-01", "Reception (sample — rename me)", "OFFICE", [
    { x: 100, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 400 }, { x: 100, y: 400 },
  ]);
  await ensureRoom(g.id, "G-02", "Emergency (sample — rename me)", "WARD", [
    { x: 550, y: 100 }, { x: 1000, y: 100 }, { x: 1000, y: 500 }, { x: 550, y: 500 },
  ]);
  await ensureRoom(g.id, "G-CORR", "Main Corridor (sample — rename me)", "CORRIDOR", [
    { x: 100, y: 420 }, { x: 1600, y: 420 }, { x: 1600, y: 480 }, { x: 100, y: 480 },
  ]);
  await ensureRoom(f1.id, "F1-ICU", "ICU Bay 1 (sample — rename me)", "ICU", [
    { x: 100, y: 100 }, { x: 700, y: 100 }, { x: 700, y: 500 }, { x: 100, y: 500 },
  ]);
  await ensureRoom(f1.id, "F1-LAB", "Pathology Lab (sample — rename me)", "LAB", [
    { x: 750, y: 100 }, { x: 1200, y: 100 }, { x: 1200, y: 400 }, { x: 750, y: 400 },
  ]);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
