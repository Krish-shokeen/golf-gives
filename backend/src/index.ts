import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import scoresRouter from "./routes/scores";
import adminDrawsRouter from "./routes/admin-draws";
import subscriptionsRouter from "./routes/subscriptions";
import webhooksRouter from "./routes/webhooks";
import charitiesRouter from "./routes/charities";
import profileRouter from "./routes/profile";
import donationsRouter from "./routes/donations";
import { winnersRouter, adminWinnersRouter } from "./routes/winners";
import dashboardRouter from "./routes/dashboard";
import adminDashboardRouter from "./routes/admin-dashboard";
import adminUsersRouter from "./routes/admin-users";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));

// Webhook route must receive the raw body for signature verification — register BEFORE express.json()
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/scores", scoresRouter);
app.use("/api/admin/draws", adminDrawsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/charities", charitiesRouter);
app.use("/api/profile", profileRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/winners", winnersRouter);
app.use("/api/admin/winners", adminWinnersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/admin/users", adminUsersRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
