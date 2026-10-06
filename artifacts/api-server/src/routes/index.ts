import { Router, type IRouter } from "express";
import automotiveRouter from "./automotive";
import generationHistoryRouter from "./generation-history";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(automotiveRouter);
router.use(generationHistoryRouter);

export default router;
