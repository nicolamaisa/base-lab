import { serve } from "@hono/node-server";

import { app } from "@/app.js";
import { env } from "@/config/env.js";

import { registerShutdownHandlers } from "@/lifecycle/shutdown.js";

import { logger } from "@/lib/logger.js";

const server = serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port: env.PORT,
  },
  (info) => {
    logger.info(
      {
        host: "0.0.0.0",
        port: info.port,
      },
      `${env.PROJECT_NAME} API started`
    );
  }
);

registerShutdownHandlers(server);
