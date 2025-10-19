import { mongoose } from '../db.js';

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: '' },
    uri: { type: String, default: '' },
    image: { type: String, default: '' },
    icon: { type: String, default: '' },
    className: { type: String, default: '' },
    levelClassName: { type: String, default: '' },
    SVG: { type: String, default: '' },
  },
  { _id: false }
);

// recursive children
MenuItemSchema.add({ children: { type: [MenuItemSchema], default: [] } });

const MenuSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // keep compatibility with frontend id
    userId: { type: String, index: true },
    name: { type: String, required: true },
    items: { type: [MenuItemSchema], default: [] },
  },
  { timestamps: true }
);

export const MenuModel = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
