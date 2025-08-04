// Enhanced socket.js implementation

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

// Socket.IO setup function
const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: { 
      origin: '*', // Consider restricting this in production
      credentials: true
    },
    // Add ping timeout and interval for better connection stability
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('Socket auth failed: No token provided');
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('Socket auth failed: User not found');
        return next(new Error('Authentication error: User not found'));
      }

      // Check if user is active
      if (user.status !== 'active') {
        console.log('Socket auth failed: User account is not active');
        return next(new Error('Authentication error: User account is not active'));
      }
      
      // Attach user to socket
      socket.user = user;
      console.log(`Socket authenticated for user: ${user._id} (${user.firstName} ${user.lastName})`);
      next();
    } catch (error) {
      console.log('Socket auth failed:', error.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Track online users
  const onlineUsers = new Map();

  // Connection event
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${userId} (${socket.user.firstName} ${socket.user.lastName})`);
    
    // Add user to online users
    onlineUsers.set(userId, socket.id);
    
    // Broadcast user online status
    io.emit('user_status', { userId, status: 'online' });
    
    // Join user to their personal room
    socket.join(userId);
    
    // Handle joining a conversation room
    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return;
      
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation: ${conversationId}`);
      
      // Notify others in the conversation that this user is online
      socket.to(conversationId).emit('user_joined', {
        userId,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        timestamp: new Date()
      });
    });
    
    // Handle leaving a conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (!conversationId) return;
      
      socket.leave(conversationId);
      console.log(`User ${userId} left conversation: ${conversationId}`);
      
      // Notify others in the conversation that this user has left
      socket.to(conversationId).emit('user_left', {
        userId,
        timestamp: new Date()
      });
    });
    
    // Handle new message
    socket.on('send_message', async (messageData) => {
      if (!messageData || !messageData.conversation) {
        console.log('Invalid message data received');
        return;
      }
      
      console.log(`Message sent in conversation ${messageData.conversation} by user ${userId}`);
      
      // Emit to all users in the conversation
      io.to(messageData.conversation).emit('new_message', {
        ...messageData,
        timestamp: new Date()
      });
      
      // Also notify each participant individually for notifications
      if (messageData.participants && Array.isArray(messageData.participants)) {
        messageData.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            io.to(participantId.toString()).emit('message_notification', {
              conversationId: messageData.conversation,
              senderId: userId,
              senderName: `${socket.user.firstName} ${socket.user.lastName}`,
              content: messageData.content,
              timestamp: new Date()
            });
          }
        });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      if (!data || !data.conversation) return;
      
      socket.to(data.conversation).emit('user_typing', {
        userId,
        typing: data.typing,
        firstName: socket.user.firstName,
        timestamp: new Date()
      });
    });
    
    // Handle read receipts
    socket.on('mark_read', (data) => {
      if (!data || !data.conversation) return;
      
      socket.to(data.conversation).emit('message_read', {
        userId,
        messageIds: data.messageIds || [data.messageId],
        timestamp: new Date()
      });
    });
    
    // Handle user activity (for online status)
    socket.on('user_activity', () => {
      // Update last activity timestamp
      onlineUsers.set(userId, socket.id);
      
      // Broadcast user online status
      socket.broadcast.emit('user_status', { 
        userId, 
        status: 'online',
        timestamp: new Date()
      });
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      
      // Remove user from online users
      onlineUsers.delete(userId);
      
      // Broadcast user offline status
      io.emit('user_status', { 
        userId, 
        status: 'offline',
        timestamp: new Date()
      });
    });
  });

  return io;
};

module.exports = setupSocket;
