import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { uploadProductImage, uploadProductVideo } from "../../config/storage";

export const mediaRouter = Router();
mediaRouter.use(requireAuth, requireRole("admin"));

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new HttpError(400, "Envie um arquivo de imagem válido."));
      return;
    }
    cb(null, true);
  },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      cb(new HttpError(400, "Envie um arquivo de vídeo válido."));
      return;
    }
    cb(null, true);
  },
});

mediaRouter.post(
  "/products/image",
  imageUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Envie um arquivo de imagem.");
    const url = await uploadProductImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ url });
  }),
);

mediaRouter.post(
  "/products/video",
  videoUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Envie um arquivo de vídeo.");
    const url = await uploadProductVideo(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ url });
  }),
);
