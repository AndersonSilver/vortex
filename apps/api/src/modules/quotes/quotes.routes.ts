import { Router } from "express";
import multer from "multer";
import path from "path";
import { customQuoteSchema, type CustomQuoteDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { uploadQuoteFile } from "../../config/storage";
import { CustomQuoteRequest } from "../../entities";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../utils/async-handler";

const ALLOWED_EXTENSIONS = new Set([".stl", ".obj", ".3mf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new HttpError(400, "Formato de arquivo não suportado. Envie STL, OBJ ou 3MF."));
      return;
    }
    cb(null, true);
  },
});

export const quotesRouter = Router();

const quoteRepo = () => AppDataSource.getRepository(CustomQuoteRequest);

function toCustomQuoteDTO(quote: CustomQuoteRequest): CustomQuoteDTO {
  return {
    id: quote.id,
    fileUrl: quote.fileUrl,
    material: quote.material,
    color: quote.color,
    qty: quote.qty,
    notes: quote.notes ?? null,
    email: quote.email,
    status: quote.status,
    quotedPrice: quote.quotedPrice !== null && quote.quotedPrice !== undefined ? Number(quote.quotedPrice) : null,
    createdAt: quote.createdAt.toISOString(),
  };
}

quotesRouter.post(
  "/",
  optionalAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "Envie um arquivo STL, OBJ ou 3MF.");
    }
    const parsed = customQuoteSchema.safeParse({
      ...req.body,
      qty: req.body.qty ? Number(req.body.qty) : undefined,
    });
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));
    }

    const fileUrl = await uploadQuoteFile(req.file.buffer, req.file.originalname);

    const quote = await quoteRepo().save(
      quoteRepo().create({
        ...parsed.data,
        fileUrl,
        userId: req.auth?.userId ?? null,
      }),
    );

    res.status(201).json(toCustomQuoteDTO(quote));
  }),
);

quotesRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const quotes = await quoteRepo().find({ order: { createdAt: "DESC" } });
    res.json(quotes.map(toCustomQuoteDTO));
  }),
);

quotesRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const quote = await quoteRepo().findOneBy({ id: req.params.id });
    if (!quote) throw new HttpError(404, "Solicitação não encontrada.");
    const { status, quotedPrice } = req.body as { status?: string; quotedPrice?: number };
    if (status) quote.status = status as CustomQuoteRequest["status"];
    if (quotedPrice !== undefined) quote.quotedPrice = quotedPrice;
    await quoteRepo().save(quote);
    res.json(toCustomQuoteDTO(quote));
  }),
);
