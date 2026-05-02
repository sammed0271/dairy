import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");
    mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));
  } catch (error) {
    console.log("DB Error:", error.message);
    process.exit(1);
  }
};
