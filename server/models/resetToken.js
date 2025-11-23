import { mongoose } from '../db.js';

const ResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

// TTL index via expiresAt; Mongo will automatically remove expired docs.

export const ResetTokenModel = mongoose.models.ResetToken || mongoose.model('ResetToken', ResetTokenSchema);
