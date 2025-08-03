const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../utils/logger');

class AuthMiddleware {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
        this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8080';
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            logger.error('JWT verification error:', error);
            return null;
        }
    }

    // Extract token from Authorization header
    extractToken(authHeader) {
        if (!authHeader) return null;
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        
        return parts[1];
    }

    // Validate token with User Service
    async validateTokenWithUserService(token) {
        try {
            const response = await axios.get(
                `${this.userServiceUrl}/api/users/validate`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                }
            );
            return response.data.valid;
        } catch (error) {
            logger.error('Token validation with User Service failed:', error.message);
            return false;
        }
    }

    // Authentication middleware
    authenticate = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const token = this.extractToken(authHeader);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Access token is required'
                });
            }

            // Verify JWT token
            const decoded = this.verifyToken(token);
            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Validate token with User Service
            const isValid = await this.validateTokenWithUserService(token);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Token validation failed'
                });
            }

            // Add user info to request
            req.user = {
                id: decoded.sub,
                username: decoded.username,
                role: decoded.role
            };

            next();
        } catch (error) {
            logger.error('Authentication middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication error'
            });
        }
    };

    // Optional authentication middleware
    optionalAuth = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const token = this.extractToken(authHeader);

            if (token) {
                const decoded = this.verifyToken(token);
                if (decoded) {
                    const isValid = await this.validateTokenWithUserService(token);
                    if (isValid) {
                        req.user = {
                            id: decoded.sub,
                            username: decoded.username,
                            role: decoded.role
                        };
                    }
                }
            }

            next();
        } catch (error) {
            logger.error('Optional authentication middleware error:', error);
            next();
        }
    };

    // Role-based authorization middleware
    authorize = (roles = []) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        };
    };

    // Admin authorization middleware
    requireAdmin = this.authorize(['ADMIN']);

    // User authorization middleware
    requireUser = this.authorize(['USER', 'ADMIN']);
}

module.exports = new AuthMiddleware(); 