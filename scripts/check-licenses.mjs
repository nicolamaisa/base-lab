import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const apps = ["api", "worker", "llm-gateway", "web"];
const aggregated = {};

console.log("🔍 Avvio scansione licenze per tutte le app...");

for (const app of apps) {
  const appPath = path.join(process.cwd(), "apps", app);

  if (!fs.existsSync(appPath)) continue;

  console.log(`📦 Scansione in corso per: apps/${app}...`);

  try {
    // Esegue license-checker-rseidelsohn nella sotto-cartella
    const stdout = execSync(
      "npx license-checker-rseidelsohn --production --excludePrivatePackages --json",
      { cwd: appPath, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );

    const licenses = JSON.parse(stdout);

    // Aggrega i risultati identificando anche a quale app appartengono
    for (const [pkgName, pkgDetails] of Object.entries(licenses)) {
      if (!aggregated[pkgName]) {
        aggregated[pkgName] = {
          ...pkgDetails,
          usedInApps: [app],
        };
      } else {
        aggregated[pkgName].usedInApps.push(app);
      }
    }
  } catch (err) {
    console.error(
      `❌ Errore durante la scansione di apps/${app}:`,
      err.message
    );
  }
}

// Salva il file unificato nella root
const outputPath = path.join(process.cwd(), "raw-licenses.json");
fs.writeFileSync(outputPath, JSON.stringify(aggregated, null, 2));

console.log(`\n✅ Scansione completata con successo!`);
console.log(`📄 Report aggregato generato in: ${outputPath}`);
console.log(
  `📊 Totale pacchetti unici rilevati: ${Object.keys(aggregated).length}`
);
