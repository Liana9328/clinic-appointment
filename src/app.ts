import express from "express";
import morgan from "morgan";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { router } from "./routes";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
