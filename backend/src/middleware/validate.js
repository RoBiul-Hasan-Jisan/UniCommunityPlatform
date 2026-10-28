import mongoose from "mongoose";

// Turn a zod schema into Express middleware. Parsed (and trimmed/coerced)
// values replace req.body, so route handlers only ever see clean data.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join(".");
      return res.status(400).json({
        error: field ? `${field}: ${issue.message}` : issue.message,
        details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }
    if (source === "query") {
      // req.query is a getter in some Express setups — mutate instead of reassigning.
      Object.keys(req.query).forEach((k) => delete req.query[k]);
      Object.assign(req.query, result.data);
    } else {
      req[source] = result.data;
    }
    next();
  };
}

// Reject malformed ObjectIds in :params up front with a clean 400 instead of
// letting Mongoose throw a CastError (which surfaces as a confusing 500).
export function validateObjectIdParams(...names) {
  return (req, res, next) => {
    for (const name of names) {
      const value = req.params[name];
      if (value !== undefined && !mongoose.isValidObjectId(value)) {
        return res.status(400).json({ error: `Invalid ${name}` });
      }
    }
    next();
  };
}

// Escape user input before it is used inside a RegExp (prevents regex
// injection / ReDoS from search boxes).
export function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 100);
}
