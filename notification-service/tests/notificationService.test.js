const NotificationService = require('../services/notificationService');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('twilio');
jest.mock('bullmq');

describe('NotificationService', () => {
  let notificationService;
  let mockTransporter;
  let mockTwilioClient;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup Nodemailer mock
    mockTransporter = {
      sendMail: jest.fn()
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
    
    // Setup Twilio mock
    mockTwilioClient = {
      messages: {
        create: jest.fn()
      }
    };
    twilio.mockReturnValue(mockTwilioClient);
    
    notificationService = new NotificationService();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };
      
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });
      
      const result = await notificationService.sendEmail(emailData);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email sent successfully');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_FROM,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      });
    });

    it('should handle email sending error', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };
      
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      
      const result = await notificationService.sendEmail(emailData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send email');
    });
  });

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const smsData = {
        to: '+91-9876543210',
        message: 'Test SMS message'
      };
      
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-sms-sid'
      });
      
      const result = await notificationService.sendSMS(smsData);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('SMS sent successfully');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: smsData.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: smsData.to
      });
    });

    it('should handle SMS sending error', async () => {
      const smsData = {
        to: '+91-9876543210',
        message: 'Test SMS message'
      };
      
      mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio error'));
      
      const result = await notificationService.sendSMS(smsData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send SMS');
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      const pushData = {
        userId: 'user123',
        title: 'Test Push',
        body: 'Test push notification',
        data: { key: 'value' }
      };
      
      const result = await notificationService.sendPushNotification(pushData);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Push notification sent successfully');
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      const orderData = {
        id: 'order123',
        userId: 'user123',
        totalAmount: 99999,
        items: [
          { productName: 'iPhone 15', quantity: 1, price: 99999 }
        ]
      };
      
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });
      
      const result = await notificationService.sendOrderConfirmation(orderData);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Order Confirmation'),
          html: expect.stringContaining('order123')
        })
      );
    });
  });

  describe('sendOrderStatusUpdate', () => {
    it('should send order status update notification', async () => {
      const orderData = {
        id: 'order123',
        status: 'shipped',
        trackingNumber: 'TRK123456789'
      };
      
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });
      
      const result = await notificationService.sendOrderStatusUpdate(orderData);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Order Status Update'),
          html: expect.stringContaining('shipped')
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email to new user', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };
      
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });
      
      const result = await notificationService.sendWelcomeEmail(userData);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userData.email,
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining('John')
        })
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      const resetData = {
        email: 'user@example.com',
        resetToken: 'reset-token-123',
        resetUrl: 'http://localhost:3000/reset-password'
      };
      
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });
      
      const result = await notificationService.sendPasswordReset(resetData);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: resetData.email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining('reset-token-123')
        })
      );
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history for user', async () => {
      const userId = 'user123';
      const mockHistory = [
        { id: '1', type: 'email', status: 'sent', createdAt: new Date() },
        { id: '2', type: 'sms', status: 'sent', createdAt: new Date() }
      ];
      
      // Mock Redis or database call
      const result = await notificationService.getNotificationHistory(userId);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notification123';
      
      const result = await notificationService.markAsRead(notificationId);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification marked as read');
    });
  });

  describe('getNotificationTemplates', () => {
    it('should return available notification templates', async () => {
      const result = await notificationService.getNotificationTemplates();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toContain('order_confirmation');
      expect(result.data).toContain('order_status_update');
      expect(result.data).toContain('welcome_email');
    });
  });

  describe('validateEmail', () => {
    it('should validate email format', () => {
      expect(notificationService.validateEmail('test@example.com')).toBe(true);
      expect(notificationService.validateEmail('invalid-email')).toBe(false);
      expect(notificationService.validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Indian phone number format', () => {
      expect(notificationService.validatePhone('+91-9876543210')).toBe(true);
      expect(notificationService.validatePhone('9876543210')).toBe(true);
      expect(notificationService.validatePhone('invalid-phone')).toBe(false);
      expect(notificationService.validatePhone('')).toBe(false);
    });
  });
}); 