import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from "node:crypto";
import { chmod, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.resolve(".env");
const BACKUP_PATH = path.resolve(".env.auth-backup");
const UPDATE_ENV = process.argv.includes("--update-env");
const PRINT_SECRETS = process.argv.includes("--print");
const ISSUER = "api";
const PROJECT_REF = "base-lab";

function parseEnv(source) {
  const values = new Map();

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match) {
      values.set(match[1], match[2]);
    }
  }

  return values;
}

function signEs256(payload, privateKey, kid) {
  const header = {
    alg: "ES256",
    typ: "JWT",
    kid,
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign("SHA256", Buffer.from(data), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${data}.${signature.toString("base64url")}`;
}

function generateOpaqueKey(prefix) {
  const random = randomBytes(17).toString("base64url").slice(0, 22);
  const intermediate = `${prefix}${random}`;
  const checksum = createHash("sha256")
    .update(`${PROJECT_REF}|${intermediate}`)
    .digest("base64url")
    .slice(0, 8);

  return `${intermediate}_${checksum}`;
}

function updateEnvSource(source, updates) {
  const remaining = new Map(Object.entries(updates));
  const lines = source.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);

    if (!match || !remaining.has(match[1])) {
      return line;
    }

    const value = remaining.get(match[1]);
    remaining.delete(match[1]);
    return `${match[1]}=${value}`;
  });

  if (lines.at(-1) !== "") {
    lines.push("");
  }

  if (remaining.size > 0) {
    lines.push("# Asymmetric Auth and opaque API keys");

    for (const [key, value] of remaining) {
      lines.push(`${key}=${value}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

let envSource;

try {
  envSource = await readFile(ENV_PATH, "utf8");
} catch {
  throw new Error(".env not found. Copy .env.example to .env first.");
}

const env = parseEnv(envSource);

const configuredJwtSecret = env.get("JWT_SECRET")?.trim();

if (configuredJwtSecret && configuredJwtSecret.length < 32) {
  throw new Error("Existing JWT_SECRET must contain at least 32 characters.");
}

const jwtSecret = configuredJwtSecret || randomBytes(32).toString("hex");

const jwtSecretGenerated = !configuredJwtSecret;

const { privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const privateJwk = privateKey.export({ format: "jwk" });
const kid = randomUUID();
const symmetricJwk = {
  kty: "oct",
  k: Buffer.from(jwtSecret).toString("base64url"),
  alg: "HS256",
};
const privateSigningJwk = {
  kty: "EC",
  kid,
  use: "sig",
  key_ops: ["sign", "verify"],
  alg: "ES256",
  ext: true,
  crv: privateJwk.crv,
  x: privateJwk.x,
  y: privateJwk.y,
  d: privateJwk.d,
};
const publicSigningJwk = {
  kty: "EC",
  kid,
  use: "sig",
  key_ops: ["verify"],
  alg: "ES256",
  ext: true,
  crv: privateJwk.crv,
  x: privateJwk.x,
  y: privateJwk.y,
};
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + 5 * 365 * 24 * 60 * 60;

const updates = {
  JWT_SECRET: jwtSecret,
  SUPABASE_PUBLISHABLE_KEY: generateOpaqueKey("sb_publishable_"),
  SUPABASE_SECRET_KEY: generateOpaqueKey("sb_secret_"),
  ANON_KEY_ASYMMETRIC: await signEs256(
    {
      role: "anon",
      iss: ISSUER,
      iat: issuedAt,
      exp: expiresAt,
    },
    privateKey,
    kid
  ),
  SERVICE_ROLE_KEY_ASYMMETRIC: await signEs256(
    {
      role: "service_role",
      iss: ISSUER,
      iat: issuedAt,
      exp: expiresAt,
    },
    privateKey,
    kid
  ),
  JWT_KEYS: JSON.stringify([privateSigningJwk, symmetricJwk]),
  JWT_JWKS: JSON.stringify({
    keys: [publicSigningJwk, symmetricJwk],
  }),
};

console.log(
  jwtSecretGenerated
    ? "Generated a new JWT_SECRET."
    : "Reused the existing JWT_SECRET."
);

if (PRINT_SECRETS) {
  for (const [key, value] of Object.entries(updates)) {
    console.log(`${key}=${value}`);
  }
} else {
  console.log("Generated asymmetric Auth keys:");

  for (const [key, value] of Object.entries(updates)) {
    console.log(`- ${key} (${fingerprint(value)})`);
  }
}

if (!UPDATE_ENV) {
  console.log("No files changed. Pass --update-env to update .env.");
  process.exit(0);
}

await copyFile(ENV_PATH, BACKUP_PATH);
await writeFile(ENV_PATH, updateEnvSource(envSource, updates), {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(ENV_PATH, 0o600);
await chmod(BACKUP_PATH, 0o600);

console.log("Updated .env and created .env.auth-backup.");
