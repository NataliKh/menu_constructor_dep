import { mongoose } from '../db.js';

const TemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export const TemplateModel = mongoose.models.Template || mongoose.model('Template', TemplateSchema);

