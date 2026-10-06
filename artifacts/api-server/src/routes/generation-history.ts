import { Router, type IRouter } from "express";
import {
  GetGenerationHistoryParams,
  GetGenerationHistoryResponse,
  ListGenerationHistoriesResponse,
} from "@workspace/api-zod";
import {
  getGenerationHistory,
  getGenerationHistoryIndex,
} from "../lib/catalog-generation-history";
import { catalogPreviewEnabled } from "../lib/model-year-catalog";

const router: IRouter = Router();

router.get("/catalog/generation-histories", (_req, res) => {
  if (!catalogPreviewEnabled()) {
    return res.status(404).json({ message: "Generation-history research is not publicly released." });
  }
  return res.json(ListGenerationHistoriesResponse.parse(getGenerationHistoryIndex()));
});

router.get("/catalog/generation-histories/:makeSlug/:modelSlug", (req, res) => {
  if (!catalogPreviewEnabled()) {
    return res.status(404).json({ message: "Generation-history research is not publicly released." });
  }
  const params = GetGenerationHistoryParams.parse(req.params);
  const detail = getGenerationHistory(params.makeSlug, params.modelSlug);
  if (!detail) return res.status(404).json({ message: "Model not found in the reviewed catalog." });
  return res.json(GetGenerationHistoryResponse.parse(detail));
});

export default router;
