import dotenv from "dotenv";
dotenv.config({ debug: false });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";

import { protect } from "./middleware/auth_middleware.js";

import router from "./routes/auth_routes.js";
import farmerRoutes from "./routes/farmer_routes.js";
import milkRoutes from "./routes/milk_routes.js";
import deductionRoutes from "./routes/deduction_routes.js";
import inventoryRoutes from "./routes/inventory_routes.js";
import bonusRoutes from "./routes/bonus_routes.js";
import billRoutes from "./routes/bill_routes.js";
import dashboardRoutes from "./routes/dashboard_routes.js";
import rateChartRoutes from "./routes/rateChart_routes.js";
import reportRoutes from "./routes/report_routes.js";
import inventoryTransactionRoutes from "./routes/inventory_transaction_routes.js";
import saleRoutes from "./routes/saleRoutes.js";
import machineRoutes from "./routes/machineRoutes.js";

import paymentRoutes from "./routes/paymentRoutes.js";
import healthRoutes from "./routes/health.js";

import centerRoutes from "./routes/center_routes.js";
import userRoutes from "./routes/user_routes.js";
const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({ origin: true, credentials: true }));

connectDB();

app.get("/", (req, res) => {
  res.send("Dairy Backend Running");
});

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", router);
app.use("/api/farmers", protect, farmerRoutes);
app.use("/api/milk", protect, milkRoutes);
app.use("/api/deductions", protect, deductionRoutes);
app.use("/api/inventory", protect, inventoryRoutes);
app.use("/api/bonus", protect, bonusRoutes);
app.use("/api/bills", protect, billRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/rate-chart", protect, rateChartRoutes);
app.use("/api/reports", protect, reportRoutes);
app.use("/api/inventory-transactions", protect, inventoryTransactionRoutes);
app.use("/api/payments", protect, paymentRoutes);
app.use("/api/sales", protect, saleRoutes);
app.use("/api/machine", machineRoutes);

app.use("/api", healthRoutes);

app.use("/api/centers", centerRoutes);
app.use("/api/users", userRoutes);
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
