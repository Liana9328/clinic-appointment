import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { ValidationError } from "../errors/app-error";

type ParsedRequestParts = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export const validate =
  (schema: ZodType<ParsedRequestParts>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.validated = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        next(new ValidationError(errorMessages));
        return;
      }
      next(error);
    }
  };
