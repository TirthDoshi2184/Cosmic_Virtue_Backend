const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin/AdminModel');

// ─── Helper ────────────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign(
    { id },
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ============================================
// REGISTER ADMIN
// POST /api/admin/auth/register
// Should be disabled / protected in production — use only to seed first admin
// ============================================
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An admin with this email already exists.',
      });
    }

    const admin = await Admin.create({ name, email, password});

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
};

// ============================================
// LOGIN ADMIN
// POST /api/admin/auth/login
// ============================================
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account inactive.',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Record last login time
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          lastLogin: admin.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: error.message,
    });
  }
};

// ============================================
// GET CURRENT ADMIN PROFILE
// GET /api/admin/auth/me  (protected)
// ============================================
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.admin, // set by adminMiddleware
  });
};

// ============================================
// CHANGE PASSWORD
// PATCH /api/admin/auth/change-password  (protected)
// ============================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new passwords are required.',
      });
    }

    // Re-fetch with password field (middleware strips it)
    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    admin.password = newPassword; // pre-save hook will hash it
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
      error: error.message,
    });
  }
};

// ============================================
// LIST ALL ADMINS (superadmin only)
// GET /api/admin/auth/admins  (protected + superAdminOnly)
// ============================================
exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins.',
      error: error.message,
    });
  }
};

// ============================================
// DEACTIVATE ADMIN (superadmin only)
// PATCH /api/admin/auth/admins/:adminId/deactivate
// ============================================
exports.deactivateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (adminId === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Admin deactivated.',
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate admin.',
      error: error.message,
    });
  }
};