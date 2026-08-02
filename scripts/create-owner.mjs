import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const ENV_PATH = path.resolve(".env");
const DELETE_AFTER_TEST = process.argv.includes("--delete-after-test");

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

function readArgument(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "A TTY is required to read the password securely. Run this command in a terminal."
    );
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }

          continue;
        }

        if (character >= " ") {
          value += character;
          process.stdout.write("*");
        }
      }
    };

    process.stdout.write(prompt);
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function errorMessage(body, fallback) {
  return (
    body.msg ?? body.message ?? body.error_description ?? body.error ?? fallback
  );
}

function decodeJwtHeader(token) {
  const [encodedHeader] = token.split(".");

  if (!encodedHeader) {
    throw new Error("Auth returned a malformed access token.");
  }

  return JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
}

if (process.argv.includes("--help")) {
  console.log(`Create the first local owner and verify the complete login flow.

Usage:
  npm run auth:create-owner
  npm run auth:create-owner -- --email owner@example.com --name "Owner"
  npm run auth:create-owner -- --email test@example.com --name "Test" --delete-after-test

The password is requested interactively and is never stored or printed.`);
  process.exit(0);
}

const env = parseEnv(await readFile(ENV_PATH, "utf8"));
const publishableKey = env.get("SUPABASE_PUBLISHABLE_KEY");
const secretKey = env.get("SUPABASE_SECRET_KEY");
const baseUrl = normalizeBaseUrl(
  readArgument("--base-url") ?? env.get("SITE_URL") ?? "http://localhost:8000"
);

if (!publishableKey || !secretKey) {
  throw new Error(
    "SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY must exist in .env."
  );
}

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email = (
  readArgument("--email") ?? (await prompt.question("Owner email: "))
)
  .trim()
  .toLowerCase();
const displayName = (
  readArgument("--name") ?? (await prompt.question("Display name: "))
).trim();

prompt.close();

if (!email || !email.includes("@")) {
  throw new Error("Enter a valid owner email.");
}

if (!displayName) {
  throw new Error("Display name cannot be empty.");
}

const password = await readHidden("Password (minimum 12 characters): ");
const confirmation = await readHidden("Confirm password: ");

if (password.length < 12) {
  throw new Error("The password must contain at least 12 characters.");
}

if (password !== confirmation) {
  throw new Error("The passwords do not match.");
}

const createResponse = await fetch(`${baseUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: secretKey,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      locale: "it-IT",
      timezone: "UTC",
    },
  }),
});
const createdUser = await readJson(createResponse);

if (createResponse.ok) {
  console.log(`Created owner ${createdUser.email ?? email}.`);
} else if (createResponse.status === 422 || createResponse.status === 409) {
  console.log("The user already exists; continuing with the login test.");
} else {
  throw new Error(
    `Owner creation failed (${createResponse.status}): ${errorMessage(
      createdUser,
      "unknown error"
    )}`
  );
}

const loginResponse = await fetch(
  `${baseUrl}/auth/v1/token?grant_type=password`,
  {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  }
);
const session = await readJson(loginResponse);

if (!loginResponse.ok || !session.access_token) {
  throw new Error(
    `Login failed (${loginResponse.status}): ${errorMessage(
      session,
      "access token missing"
    )}`
  );
}

const jwtHeader = decodeJwtHeader(session.access_token);

if (jwtHeader.alg !== "ES256") {
  throw new Error(`Unexpected access-token algorithm: ${jwtHeader.alg}`);
}

const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${session.access_token}`,
  },
});
const me = await readJson(meResponse);

if (!meResponse.ok || me.user?.email !== email) {
  throw new Error(
    `/api/auth/me failed (${meResponse.status}): ${errorMessage(
      me,
      "unexpected user or profile"
    )}`
  );
}

console.log(`Login verified with ES256 for user ${me.user.id}.`);
console.log("/api/auth/me and the automatic profile verified.");

if (DELETE_AFTER_TEST) {
  const deleteResponse = await fetch(
    `${baseUrl}/auth/v1/admin/users/${me.user.id}`,
    {
      method: "DELETE",
      headers: {
        apikey: secretKey,
      },
    }
  );

  if (!deleteResponse.ok) {
    const body = await readJson(deleteResponse);

    throw new Error(
      `Test-user cleanup failed (${deleteResponse.status}): ${errorMessage(
        body,
        "unknown error"
      )}`
    );
  }

  console.log("Temporary user deleted after the successful test.");
}
