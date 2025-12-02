import mongoose from "mongoose";

const { Schema } = mongoose;

const ReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String },
  stage: { type: Number, required: true }, // 0..4
  stageLabel: { type: String },
  probabilities: { type: [Number], default: [] },
  reportText: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Report", ReportSchema);
