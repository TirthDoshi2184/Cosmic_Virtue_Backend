const UserSchema = require('../models/UserModel');
const jwt = require('jsonwebtoken');

// Create new user
const createUser = async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;
    
    // Password will be automatically hashed by the pre-save hook
    const user = new UserSchema({
      email,
      password,  // Plain password - will be hashed automatically
      phoneNumber
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const LoginUser = async (req, res) => {
    try {
    const { email, password } = req.body;
    
    // Find user
    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log("jwt", process.env.JWT_SECRET);
    const token = jwt.sign(
  { userId: user._id }, 
  process.env.JWT_SECRET, 
  { expiresIn: '7d' }
);

// Return token + user info
res.json({ 
  message: 'Login successful', 
  userId: user._id,
  token: token,  // ← Missing!
  user: {        // ← Missing!
    id: user._id,
    email: user.email,
    phoneNumber: user.phoneNumber
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users
const getAllUser = async (req, res) => {
    try {
        const users = await UserSchema.find().select('-password'); // Exclude password from response
        res.status(200).json({
            data: users,
            message: "Successfully got all the Users"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching users",
            error: error.message
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        const deletedUser = await UserSchema.findByIdAndDelete(id);
        
        if (deletedUser) {
            res.status(200).json({
                data: deletedUser,
                message: 'User deleted successfully'
            });
        } else {
            res.status(404).json({
                message: 'No such user found'
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "Error deleting user",
            error: error.message
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const { email, password, phoneNumber } = req.body;

        // Find the user first
        const user = await UserSchema.findById(id);
        if (!user) {
            return res.status(404).json({
                message: "No such user found to update"
            });
        }

        // Update fields if provided
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (password) user.password = password; // Will be auto-hashed by pre-save hook

        // Save the user (triggers pre-save hook for password hashing)
        const updatedUser = await user.save();

        // Remove password from response
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.status(200).json({
            data: userResponse,
            message: "Updated user successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "An error occurred while updating the user",
            error: error.message
        });
    }
};

// Get single user
const getSingleUser = async (req, res) => {
    try {
        const id = req.params.id;
        
        const user = await UserSchema.findById(id).select('-password'); // Exclude password
        
        if (user) {
            res.status(200).json({
                data: user,
                message: "User fetched successfully"
            });
        } else {
            res.status(404).json({
                message: "User not found"
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "Error fetching user",
            error: error.message
        });
    }
};

module.exports = {
    createUser,
    LoginUser,
    getAllUser,
    deleteUser,
    updateUser,
    getSingleUser
};