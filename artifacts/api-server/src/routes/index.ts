import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import consoleRouter from "./console";
import memoryRouter from "./memory";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(consoleRouter);
router.use(memoryRouter);
router.use(githubRouter);

export default router;
