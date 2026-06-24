import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import consoleRouter from "./console";
import memoryRouter from "./memory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(consoleRouter);
router.use(memoryRouter);

export default router;
