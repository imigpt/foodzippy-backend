import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';
import User from '../models/User.js';

/**
 * Combined authentication middleware that supports both:
 * 1. Old Agent model tokens (for backward compatibility)
 * 2. New User model tokens (for agents and employees)
 */
const combinedAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');

    // Check if it's a User token (new system)
    if (decoded.userId) {
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Invalid token.',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated.',
        });
      }

      // Attach user info to request
      req.user = {
        userId: user._id,
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      };

      return next();
    }

    // Check if it's an Agent token (old system - backward compatibility)
    if (decoded.agentId) {
      const agent = await Agent.findById(decoded.agentId);

      if (!agent) {
        return res.status(401).json({
          success: false,
          message: 'Agent not found. Invalid token.',
        });
      }

      if (!agent.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated.',
        });
      }

      // Attach agent info to request (for backward compatibility)
      req.agent = {
        agentId: agent._id,
        id: agent._id,
        name: agent.name,
        username: agent.username,
      };

      return next();
    }

    // Invalid token format
    return res.status(401).json({
      success: false,
      message: 'Invalid token format.',
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    console.error('Combined auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

export default combinedAuth;
