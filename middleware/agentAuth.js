import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';

const agentAuth = async (req, res, next) => {
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

    // Check if agent exists and is active
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

    // Attach agent info to request
    req.agent = {
      agentId: agent._id,
      id: agent._id,
      name: agent.name,
      username: agent.username,
    };

    next();
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

    console.error('Agent auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

export default agentAuth;
