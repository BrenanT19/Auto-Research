import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:net";
import pg from "pg";

const { Client, Pool } = pg;
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function parseSafeTestDatabaseUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl ?? "");
  } catch {
    throw new Error(
      "Set AUTO_RESEARCH_TEST_DATABASE_URL to a local PostgreSQL URL for the auto_research_test database.",
    );
  }

  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  let databaseName = "";
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1));
  } catch {
    // Keep malformed paths on the same fail-closed path as unsafe targets.
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !allowedHosts.has(url.hostname.toLowerCase()) ||
    databaseName !== "auto_research_test" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "AUTO_RESEARCH_TEST_DATABASE_URL must point to a local PostgreSQL database named exactly auto_research_test and must not include query options or a fragment.",
    );
  }

  return { connectionString: rawUrl, databaseName };
}

function runCommand(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with ${signal ?? `code ${code}`}.`,
          ),
        );
      }
    });
  });
}

async function findFreePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not reserve a local API port.");
  }
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return address.port;
}

async function waitForApi(apiUrl, serverProcess) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error("The temporary Auto Research API server stopped before it became ready.");
    }
    try {
      const response = await fetch(`${apiUrl}/vehicles?limit=1`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The server may still be building its first database connection.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("The temporary Auto Research API server did not become ready.");
}

async function seedDemoVehicles(pool) {
  const fixtures = [
    {
      make: "Ford",
      makeSlug: "ford",
      mark: "F",
      model: "F-150",
      modelSlug: "f-150",
      generation: "Fourteenth generation",
      startYear: 2021,
      endYear: 2026,
      bodyType: "Pickup",
      year: 2024,
      fuelType: "Gasoline",
      engine: "3.5L V6",
      horsepower: 400,
      transmission: "10-speed automatic",
      gears: "10-speed",
      trim: "XLT",
      vehicleSlug: "ford-f-150-2024-xlt",
      drivetrain: "4WD",
      mpgCity: 18,
      mpgHighway: 23,
      mpgCombined: 20,
      priceUsd: 50_000,
      researchRank: 1,
    },
    {
      make: "Tesla",
      makeSlug: "tesla",
      mark: "T",
      model: "Model Y",
      modelSlug: "model-y",
      generation: "First generation",
      startYear: 2020,
      endYear: null,
      bodyType: "SUV",
      year: 2024,
      fuelType: "Electric",
      engine: "Dual electric motors",
      horsepower: 384,
      transmission: "Single-speed",
      gears: "1-speed",
      trim: "Long Range",
      vehicleSlug: "tesla-model-y-2024-long-range",
      drivetrain: "AWD",
      mpgCity: 127,
      mpgHighway: 117,
      mpgCombined: 122,
      priceUsd: 48_990,
      researchRank: 2,
    },
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const fixture of fixtures) {
      const make = await client.query(
        "INSERT INTO makes (name, slug, mark, origin) VALUES ($1, $2, $3, $4) RETURNING id",
        [fixture.make, fixture.makeSlug, fixture.mark, "United States"],
      );
      const model = await client.query(
        "INSERT INTO models (make_id, name, slug) VALUES ($1, $2, $3) RETURNING id",
        [make.rows[0].id, fixture.model, fixture.modelSlug],
      );
      const generation = await client.query(
        "INSERT INTO generations (model_id, name, start_year, end_year, body_type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [
          model.rows[0].id,
          fixture.generation,
          fixture.startYear,
          fixture.endYear,
          fixture.bodyType,
        ],
      );
      const modelYear = await client.query(
        "INSERT INTO model_years (generation_id, year, fuel_type) VALUES ($1, $2, $3) RETURNING id",
        [generation.rows[0].id, fixture.year, fixture.fuelType],
      );
      const engine = await client.query(
        "INSERT INTO engines (model_year_id, name, horsepower, fuel_type, availability) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [
          modelYear.rows[0].id,
          fixture.engine,
          fixture.horsepower,
          fixture.fuelType,
          "Standard",
        ],
      );
      const transmission = await client.query(
        "INSERT INTO transmissions (model_year_id, name, gears, availability) VALUES ($1, $2, $3, $4) RETURNING id",
        [modelYear.rows[0].id, fixture.transmission, fixture.gears, "Standard"],
      );
      const trim = await client.query(
        "INSERT INTO trims (model_year_id, engine_id, transmission_id, name, slug, drivetrain, fuel_type, mpg_city, mpg_highway, mpg_combined, horsepower, price_usd, research_rank, is_demo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true) RETURNING id",
        [
          modelYear.rows[0].id,
          engine.rows[0].id,
          transmission.rows[0].id,
          fixture.trim,
          fixture.vehicleSlug,
          fixture.drivetrain,
          fixture.fuelType,
          fixture.mpgCity,
          fixture.mpgHighway,
          fixture.mpgCombined,
          fixture.horsepower,
          fixture.priceUsd,
          fixture.researchRank,
        ],
      );
      await client.query(
        "INSERT INTO ownership_estimates (trim_id, reliability_score, reliability_label, reliability_note, annual_ownership_usd, annual_maintenance_usd, annual_repair_usd, annual_fuel_usd, annual_insurance_usd, five_year_depreciation_percent, expected_lifespan_miles, is_demo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)",
        [
          trim.rows[0].id,
          fixture.make === "Tesla" ? 7.5 : 7,
          "Illustrative estimate",
          "Fixed test fixture; not verified vehicle guidance.",
          9_000,
          1_200,
          900,
          2_000,
          1_500,
          40,
          180_000,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  serverProcess.kill("SIGTERM");
  let timeout;
  await Promise.race([
    once(serverProcess, "exit"),
    new Promise((resolvePromise) => {
      timeout = setTimeout(resolvePromise, 5_000);
      timeout.unref();
    }),
  ]);
  clearTimeout(timeout);
  if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill("SIGKILL");
    await once(serverProcess, "exit");
  }
}

async function main() {
  await runCommand(
    "pnpm",
    ["--filter", "@workspace/scripts", "run", "test:auto-research:safety"],
    process.env,
  );

  const { connectionString, databaseName } = parseSafeTestDatabaseUrl(
    process.env.AUTO_RESEARCH_TEST_DATABASE_URL,
  );
  let adminClient;
  let testPool;
  let serverProcess;
  let temporaryDatabase;
  let temporaryDatabaseCreated = false;

  try {
    adminClient = new Client({ connectionString });
    await adminClient.connect();
    const selectedDatabase = await adminClient.query("SELECT current_database() AS name");
    if (selectedDatabase.rows[0]?.name !== databaseName) {
      throw new Error("The test database URL did not select the expected local test database.");
    }

    const generatedDatabase = `auto_research_test_run_${process.pid}_${randomBytes(4).toString("hex")}`;
    try {
      await adminClient.query(`CREATE DATABASE "${generatedDatabase}"`);
    } catch {
      throw new Error(
        "Could not create the temporary test database. Ensure the local auto_research_test role has CREATEDB permission.",
      );
    }
    temporaryDatabase = generatedDatabase;
    temporaryDatabaseCreated = true;

    const temporaryUrl = new URL(connectionString);
    temporaryUrl.pathname = `/${temporaryDatabase}`;
    const temporaryConnectionString = temporaryUrl.toString();
    const childEnv = {
      ...process.env,
      DATABASE_URL: temporaryConnectionString,
      NODE_ENV: "test",
    };

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "push"],
      childEnv,
    );

    testPool = new Pool({ connectionString: temporaryConnectionString });
    await seedDemoVehicles(testPool);

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/api-server", "run", "build"],
      childEnv,
    );

    const port = await findFreePort();
    serverProcess = spawn(
      process.execPath,
      ["--enable-source-maps", resolve(workspaceRoot, "artifacts/api-server/dist/index.mjs")],
      {
        cwd: workspaceRoot,
        env: { ...childEnv, NODE_ENV: "development", PORT: String(port) },
        stdio: "inherit",
      },
    );
    const apiBaseUrl = `http://127.0.0.1:${port}/api`;
    await waitForApi(apiBaseUrl, serverProcess);

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "test:auto-research:checks"],
      {
        ...process.env,
        AUTO_RESEARCH_API_BASE_URL: apiBaseUrl,
      },
    );
  } finally {
    if (serverProcess) await stopServer(serverProcess);
    if (testPool) await testPool.end();
    if (temporaryDatabaseCreated && temporaryDatabase && adminClient) {
      try {
        await adminClient.query(`DROP DATABASE "${temporaryDatabase}"`);
      } catch {
        console.error(
          `Could not remove temporary database ${temporaryDatabase}; drop it manually after confirming no test process is using it.`,
        );
        process.exitCode = 1;
      }
    }
    if (adminClient) await adminClient.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Auto Research test setup failed.",
    );
    process.exitCode = 1;
  });
}