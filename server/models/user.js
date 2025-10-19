import { mongoose } from '../db.js';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Ensure there is only one admin in the system
UserSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'admin' } });

// Guard: admin role allowed only for username "admin"
UserSchema.pre('validate', function(next) {
  if (this.role === 'admin' && this.username !== 'admin') {
    return next(new Error('Admin role allowed only for username "admin"'));
  }
  next();
});
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);


