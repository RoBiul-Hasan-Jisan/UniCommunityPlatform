import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import { uploadsEnabled, uploadImageBuffer } from "../utils/cloud.js";

const router = express.Router();

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => (ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG, WebP or GIF images are allowed"))),
});

// Tells the frontend whether to show the "attach image" button at all.
router.get("/status", requireAuth, (req, res) => res.json({ enabled: uploadsEnabled(), maxBytes: MAX_BYTES }));

router.post("/image", requireAuth, uploadLimiter, (req, res, next) => {
  if (!uploadsEnabled()) return res.status(503).json({ error: "Image uploads aren't configured on this server." });
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 5 MB)" : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "No image provided" });
    try {
      const result = await uploadImageBuffer(req.file.buffer, `uniconnect/${req.query.kind === "avatar" ? "avatars" : "uploads"}`);
      res.status(201).json({ url: result.secure_url, width: result.width, height: result.height });
    } catch (e) {
      next(e);
    }
  });
});

export default router;
