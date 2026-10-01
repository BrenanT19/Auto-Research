import { Router, type IRouter } from "express";
import automotiveRouter from "./automotive";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(automotiveRouter);

export default router;
