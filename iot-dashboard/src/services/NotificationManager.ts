// Professional Notification System
// Enterprise-grade notification management with advanced features

import { EventEmitter } from '../utils/EventEmitter';
import NotificationService from '../utils/NotificationService';
import { Device, Alarm } from '../types';

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationChannel = 'system' | 'alarm' | 'subscription' | 'device' | 'command' | 'user';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface NotificationAction {
  label: string;
  action: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'error';
  icon?: string;
}

export interface NotificationOptions {
  id?: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  priority?: NotificationPriority;
  type?: string;
  channel?: NotificationChannel;
  deviceId?: string;
  alarmId?: string;
  subscriptionId?: string;
  timestamp?: string;
  duration?: number; // Auto-dismiss duration in ms (0 = persistent)
  expirationTime?: number; // Expiration timestamp (ms since epoch)
  actions?: NotificationAction[];
  groupKey?: string; // For grouping similar notifications
  persistent?: boolean; // Don't auto-dismiss
  showInApp?: boolean; // Show in-app toast (default: true)
  showNative?: boolean; // Show native notification (default: true for mobile)
  sound?: boolean;
  vibration?: boolean;
  data?: Record<string, any>; // Additional metadata
  tags?: string[]; // For filtering/categorization
  category?: string; // Notification category
  silent?: boolean; // Don't emit events (for internal use)
}

export interface QueuedNotification extends NotificationOptions {
  id: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  expired: boolean;
  groupCount?: number; // Number of similar notifications grouped
  retryCount?: number; // Number of retry attempts
  lastError?: string; // Last error message
}

export interface NotificationConfig {
  maxHistorySize?: number;
  maxQueueSize?: number;
  throttleDuration?: number;
  deduplicationWindow?: number;
  groupingWindow?: number;
  maxNotificationsPerMinute?: number;
  queueProcessingInterval?: number;
  enableNativeNotifications?: boolean;
  enableInAppNotifications?: boolean;
  logLevel?: LogLevel;
  enableAnalytics?: boolean;
  notificationExpirationHours?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface NotificationMetrics {
  totalSent: number;
  totalRead: number;
  totalDismissed: number;
  totalExpired: number;
  totalThrottled: number;
  totalDeduplicated: number;
  totalGrouped: number;
  totalFailed: number;
  byType: Record<string, number>;
  bySeverity: Record<NotificationSeverity, number>;
  byChannel: Record<NotificationChannel, number>;
}

export interface NotificationMiddleware {
  name: string;
  execute: (notification: QueuedNotification) => Promise<QueuedNotification | null>;
}

class NotificationManager extends EventEmitter {
  private queue: QueuedNotification[] = [];
  private history: QueuedNotification[] = [];
  private config: Required<NotificationConfig>;
  private processingQueue = false;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private throttleMap = new Map<string, number>();
  private deduplicationMap = new Map<string, { notification: QueuedNotification; timestamp: number }>();
  private groupingMap = new Map<string, QueuedNotification[]>();
  private metrics: NotificationMetrics;
  private middlewares: NotificationMiddleware[] = [];
  private cleanupIntervals: NodeJS.Timeout[] = [];
  private isInitialized = false;

  // Default configuration
  private readonly DEFAULT_CONFIG: Required<NotificationConfig> = {
    maxHistorySize: 1000,
    maxQueueSize: 100,
    throttleDuration: 5000,
    deduplicationWindow: 30000,
    groupingWindow: 10000,
    maxNotificationsPerMinute: 20,
    queueProcessingInterval: 500,
    enableNativeNotifications: true,
    enableInAppNotifications: true,
    logLevel: 'warn',
    enableAnalytics: true,
    notificationExpirationHours: 24,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  constructor(config?: NotificationConfig) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.initialize();
  }

  /**
   * Initialize the notification manager
   */
  private async initialize() {
    if (this.isInitialized) return;

    try {
      this.loadHistory();
      this.cleanupExpiredNotifications();
      this.startQueueProcessor();
      this.startCleanupTasks();
      
      if (this.config.enableNativeNotifications) {
        await this.initializeNativeNotifications();
      }

      this.isInitialized = true;
      this.log('info', 'NotificationManager initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize NotificationManager', error);
      throw error;
    }
  }

  /**
   * Initialize native notifications (Capacitor)
   */
  private async initializeNativeNotifications() {
    try {
      await NotificationService.initialize();
      this.log('debug', 'Native notifications initialized');
    } catch (error) {
      this.log('error', 'Error initializing native notifications', error);
      // Don't throw - continue without native notifications
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): NotificationMetrics {
    return {
      totalSent: 0,
      totalRead: 0,
      totalDismissed: 0,
      totalExpired: 0,
      totalThrottled: 0,
      totalDeduplicated: 0,
      totalGrouped: 0,
      totalFailed: 0,
      byType: {},
      bySeverity: {
        success: 0,
        error: 0,
        warning: 0,
        info: 0,
      },
      byChannel: {
        system: 0,
        alarm: 0,
        subscription: 0,
        device: 0,
        command: 0,
        user: 0,
      },
    };
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: NotificationMiddleware) {
    this.middlewares.push(middleware);
    this.log('debug', `Middleware added: ${middleware.name}`);
  }

  /**
   * Remove middleware
   */
  removeMiddleware(name: string) {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
    this.log('debug', `Middleware removed: ${name}`);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
    this.log('info', 'Configuration updated', config);
    this.emit('configUpdated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<NotificationConfig>> {
    return { ...this.config };
  }

  /**
   * Get metrics
   */
  getMetrics(): Readonly<NotificationMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = this.initializeMetrics();
    this.log('info', 'Metrics reset');
    this.emit('metricsReset');
  }

  /**
   * Add a notification to the queue
   */
  async notify(options: NotificationOptions): Promise<string> {
    try {
      // Validate notification
      this.validateNotification(options);

      const notification: QueuedNotification = {
        id: options.id || this.generateId(),
        title: options.title.trim(),
        message: options.message.trim(),
        severity: options.severity || 'info',
        priority: options.priority || 'normal',
        type: options.type || 'general',
        channel: options.channel || this.inferChannel(options),
        deviceId: options.deviceId,
        alarmId: options.alarmId,
        subscriptionId: options.subscriptionId,
        timestamp: options.timestamp || new Date().toISOString(),
        duration: options.duration ?? (options.persistent ? 0 : 5000),
        expirationTime: options.expirationTime || this.calculateExpirationTime(),
        actions: options.actions || [],
        groupKey: options.groupKey || this.generateGroupKey(options),
        persistent: options.persistent || false,
        showInApp: options.showInApp !== false && this.config.enableInAppNotifications,
        showNative: options.showNative !== undefined ? options.showNative : this.config.enableNativeNotifications,
        sound: options.sound,
        vibration: options.vibration,
        data: options.data || {},
        tags: options.tags || [],
        category: options.category,
        read: false,
        dismissed: false,
        expired: false,
        retryCount: 0,
      };

      // Apply middlewares
      let processedNotification: QueuedNotification | null = notification;
      for (const middleware of this.middlewares) {
        try {
          processedNotification = await middleware.execute(processedNotification);
          if (!processedNotification) {
            this.log('debug', `Notification filtered by middleware: ${middleware.name}`);
            return notification.id;
          }
        } catch (error) {
          this.log('error', `Middleware error (${middleware.name}):`, error);
        }
      }

      if (!processedNotification) {
        return notification.id;
      }

      // Check expiration
      if (this.isExpired(processedNotification)) {
        this.log('debug', 'Notification expired before processing');
        this.updateMetrics('totalExpired', processedNotification);
        return processedNotification.id;
      }

      // Check rate limiting
      if (!this.checkRateLimit()) {
        this.log('warn', 'Notification rate limit exceeded');
        this.updateMetrics('totalThrottled', processedNotification);
        return processedNotification.id;
      }

      // Check throttling
      if (!this.checkThrottle(processedNotification)) {
        this.log('debug', 'Notification throttled, grouping');
        this.groupNotification(processedNotification);
        this.updateMetrics('totalGrouped', processedNotification);
        return processedNotification.id;
      }

      // Check deduplication
      if (this.isDuplicate(processedNotification)) {
        this.log('debug', 'Duplicate notification detected');
        this.updateMetrics('totalDeduplicated', processedNotification);
        return processedNotification.id;
      }

      // Check queue size
      if (this.queue.length >= this.config.maxQueueSize) {
        this.log('warn', 'Queue full, removing oldest notification');
        this.queue.shift();
      }

      // Add to queue
      this.queue.push(processedNotification);
      this.updateDeduplicationMap(processedNotification);

      // Process queue
      this.processQueue();

      // Emit event for UI components (unless silent)
      if (!options.silent) {
        this.emit('notification', processedNotification);
      }

      // Update metrics
      this.updateMetrics('totalSent', processedNotification);

      this.log('debug', `Notification queued: ${processedNotification.id}`);
      return processedNotification.id;
    } catch (error) {
      this.log('error', 'Error adding notification:', error);
      this.updateMetrics('totalFailed', { type: options.type || 'unknown' } as QueuedNotification);
      throw error;
    }
  }

  /**
   * Validate notification options
   */
  private validateNotification(options: NotificationOptions): void {
    if (!options.title || options.title.trim().length === 0) {
      throw new Error('Notification title is required');
    }
    if (!options.message || options.message.trim().length === 0) {
      throw new Error('Notification message is required');
    }
    if (options.duration !== undefined && options.duration < 0) {
      throw new Error('Notification duration must be non-negative');
    }
  }

  /**
   * Infer channel from notification options
   */
  private inferChannel(options: NotificationOptions): NotificationChannel {
    if (options.alarmId) return 'alarm';
    if (options.subscriptionId) return 'subscription';
    if (options.deviceId) return 'device';
    if (options.type === 'command') return 'command';
    return 'system';
  }

  /**
   * Calculate expiration time
   */
  private calculateExpirationTime(): number {
    return Date.now() + (this.config.notificationExpirationHours * 60 * 60 * 1000);
  }

  /**
   * Check if notification is expired
   */
  private isExpired(notification: QueuedNotification): boolean {
    if (!notification.expirationTime) return false;
    return Date.now() > notification.expirationTime;
  }

  /**
   * Process the notification queue
   */
  private async processQueue() {
    if (this.processingQueue || this.queue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.queue.length > 0) {
        const notification = this.queue.shift();
        if (!notification) break;

        // Check expiration
        if (this.isExpired(notification)) {
          notification.expired = true;
          this.addToHistory(notification);
          this.updateMetrics('totalExpired', notification);
          continue;
        }

        try {
          // Show in-app notification
          if (notification.showInApp) {
            this.emit('showToast', notification);
          }

          // Show native notification (mobile)
          if (notification.showNative && this.shouldShowNative(notification)) {
            await this.showNativeNotificationWithRetry(notification);
          }

          // Add to history
          this.addToHistory(notification);

          // Small delay between notifications
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          this.log('error', `Error processing notification ${notification.id}:`, error);
          this.handleNotificationError(notification, error as Error);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Show native notification with retry logic
   */
  private async showNativeNotificationWithRetry(notification: QueuedNotification, attempt = 0): Promise<void> {
    try {
      await this.showNativeNotification(notification);
      notification.retryCount = 0;
      notification.lastError = undefined;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        notification.retryCount = (notification.retryCount || 0) + 1;
        notification.lastError = (error as Error).message;
        this.log('warn', `Retrying native notification (attempt ${attempt + 1}/${this.config.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        return this.showNativeNotificationWithRetry(notification, attempt + 1);
      } else {
        this.log('error', `Failed to show native notification after ${this.config.retryAttempts} attempts`);
        this.updateMetrics('totalFailed', notification);
        throw error;
      }
    }
  }

  /**
   * Handle notification processing error
   */
  private handleNotificationError(notification: QueuedNotification, error: Error) {
    notification.lastError = error.message;
    notification.retryCount = (notification.retryCount || 0) + 1;

    if (notification.retryCount < this.config.retryAttempts) {
      // Retry by adding back to queue
      setTimeout(() => {
        this.queue.push(notification);
        this.processQueue();
      }, this.config.retryDelay * notification.retryCount);
    } else {
      // Max retries reached, add to history as failed
      this.addToHistory(notification);
      this.updateMetrics('totalFailed', notification);
      this.emit('notificationFailed', notification, error);
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor() {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }

    this.queueProcessorInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, this.config.queueProcessingInterval);
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks() {
    // Clean up expired notifications every hour
    const cleanupInterval = setInterval(() => {
      this.cleanupExpiredNotifications();
      this.cleanupThrottleMap();
      this.cleanupDeduplicationMap();
    }, 60 * 60 * 1000);

    this.cleanupIntervals.push(cleanupInterval);
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications() {
    const now = Date.now();
    let cleaned = 0;

    // Clean history
    this.history = this.history.filter(n => {
      if (n.expirationTime && now > n.expirationTime) {
        n.expired = true;
        cleaned++;
        return false; // Remove expired
      }
      return true;
    });

    // Clean queue
    this.queue = this.queue.filter(n => {
      if (n.expirationTime && now > n.expirationTime) {
        n.expired = true;
        cleaned++;
        return false; // Remove expired
      }
      return true;
    });

    if (cleaned > 0) {
      this.log('debug', `Cleaned up ${cleaned} expired notifications`);
      this.saveHistory();
    }
  }

  /**
   * Clean up throttle map
   */
  private cleanupThrottleMap() {
    const now = Date.now();
    const throttleWindow = this.config.throttleDuration * 2;

    for (const [key, timestamp] of this.throttleMap.entries()) {
      if (now - timestamp > throttleWindow) {
        this.throttleMap.delete(key);
      }
    }
  }

  /**
   * Clean up deduplication map
   */
  private cleanupDeduplicationMap() {
    const now = Date.now();
    const dedupWindow = this.config.deduplicationWindow;

    for (const [key, entry] of this.deduplicationMap.entries()) {
      if (now - entry.timestamp > dedupWindow) {
        this.deduplicationMap.delete(key);
      }
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentCount = this.history.filter(
      n => new Date(n.timestamp).getTime() > oneMinuteAgo
    ).length;

    return recentCount < this.config.maxNotificationsPerMinute;
  }

  /**
   * Check throttling (prevent spam)
   */
  private checkThrottle(notification: QueuedNotification): boolean {
    const throttleKey = notification.groupKey || notification.type || 'general';
    const lastTime = this.throttleMap.get(throttleKey) || 0;
    const now = Date.now();

    if (now - lastTime < this.config.throttleDuration) {
      return false; // Throttled
    }

    this.throttleMap.set(throttleKey, now);
    return true;
  }

  /**
   * Check if notification is duplicate
   */
  private isDuplicate(notification: QueuedNotification): boolean {
    const dedupKey = `${notification.type}_${notification.deviceId}_${notification.message}`;
    const entry = this.deduplicationMap.get(dedupKey);
    
    if (!entry) return false;
    
    // Check if still within deduplication window
    const now = Date.now();
    if (now - entry.timestamp < this.config.deduplicationWindow) {
      return true; // Duplicate
    }
    
    return false;
  }

  /**
   * Update deduplication map
   */
  private updateDeduplicationMap(notification: QueuedNotification) {
    const dedupKey = `${notification.type}_${notification.deviceId}_${notification.message}`;
    this.deduplicationMap.set(dedupKey, {
      notification,
      timestamp: Date.now(),
    });
  }

  /**
   * Group similar notifications
   */
  private groupNotification(notification: QueuedNotification) {
    const groupKey = notification.groupKey || 'general';
    const existing = this.groupingMap.get(groupKey) || [];
    
    existing.push(notification);
    this.groupingMap.set(groupKey, existing);

    // Update the grouped notification
    const groupedNotification: QueuedNotification = {
      ...notification,
      groupCount: existing.length,
      message: `${notification.message} (${existing.length} similar)`,
    };

    this.emit('notificationGrouped', groupedNotification);
    
    // Clear grouping after window
    setTimeout(() => {
      this.groupingMap.delete(groupKey);
    }, this.config.groupingWindow);
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    metric: 'totalSent' | 'totalRead' | 'totalDismissed' | 'totalExpired' | 'totalThrottled' | 'totalDeduplicated' | 'totalGrouped' | 'totalFailed',
    notification: QueuedNotification | { type?: string; severity?: NotificationSeverity; channel?: NotificationChannel }
  ) {
    if (!this.config.enableAnalytics) return;

    switch (metric) {
      case 'totalSent':
        this.metrics.totalSent++;
        break;
      case 'totalRead':
        this.metrics.totalRead++;
        break;
      case 'totalDismissed':
        this.metrics.totalDismissed++;
        break;
      case 'totalExpired':
        this.metrics.totalExpired++;
        break;
      case 'totalThrottled':
        this.metrics.totalThrottled++;
        break;
      case 'totalDeduplicated':
        this.metrics.totalDeduplicated++;
        break;
      case 'totalGrouped':
        this.metrics.totalGrouped++;
        break;
      case 'totalFailed':
        this.metrics.totalFailed++;
        break;
    }

    if ('type' in notification && notification.type) {
      this.metrics.byType[notification.type] = (this.metrics.byType[notification.type] || 0) + 1;
    }

    if ('severity' in notification && notification.severity) {
      this.metrics.bySeverity[notification.severity]++;
    }

    if ('channel' in notification && notification.channel) {
      this.metrics.byChannel[notification.channel]++;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate group key for similar notifications
   */
  private generateGroupKey(options: NotificationOptions): string {
    return `${options.type}_${options.deviceId}_${options.severity}`;
  }

  /**
   * Show native notification
   */
  private async showNativeNotification(notification: QueuedNotification) {
    try {
      await NotificationService.showNotification({
        title: notification.title,
        body: notification.message,
        severity: notification.severity,
        type: notification.type,
      });
    } catch (error) {
      this.log('error', 'Error showing native notification:', error);
      throw error;
    }
  }

  /**
   * Check if native notification should be shown
   */
  private shouldShowNative(notification: QueuedNotification): boolean {
    // Only show native for high priority or critical notifications
    // Or if user is not actively viewing the app
    return notification.priority === 'high' || 
           notification.priority === 'critical' ||
           document.hidden; // User is not viewing the page
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: QueuedNotification) {
    this.history.unshift(notification);
    
    // Limit history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(0, this.config.maxHistorySize);
    }

    // Persist to localStorage
    this.saveHistory();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string) {
    const notification = this.history.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveHistory();
      this.updateMetrics('totalRead', notification);
      this.emit('notificationRead', notification);
      this.log('debug', `Notification marked as read: ${notificationId}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    const unreadCount = this.history.filter(n => !n.read && !n.dismissed).length;
    this.history.forEach(n => {
      if (!n.read) {
        n.read = true;
        this.updateMetrics('totalRead', n);
      }
    });
    this.saveHistory();
    this.emit('allNotificationsRead');
    this.log('info', `Marked ${unreadCount} notifications as read`);
  }

  /**
   * Dismiss notification
   */
  dismiss(notificationId: string) {
    const notification = this.history.find(n => n.id === notificationId);
    if (notification && !notification.dismissed) {
      notification.dismissed = true;
      this.saveHistory();
      this.updateMetrics('totalDismissed', notification);
      this.emit('notificationDismissed', notification);
      this.log('debug', `Notification dismissed: ${notificationId}`);
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    const count = this.history.length;
    this.history = [];
    this.queue = [];
    this.saveHistory();
    this.emit('notificationsCleared');
    this.log('info', `Cleared ${count} notifications`);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.history.filter(n => !n.read && !n.dismissed && !n.expired).length;
  }

  /**
   * Get notifications
   */
  getNotifications(options?: {
    unreadOnly?: boolean;
    limit?: number;
    type?: string;
    deviceId?: string;
    channel?: NotificationChannel;
    severity?: NotificationSeverity;
    tags?: string[];
    includeExpired?: boolean;
  }): QueuedNotification[] {
    let notifications = [...this.history];

    if (!options?.includeExpired) {
      notifications = notifications.filter(n => !n.expired);
    }

    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read && !n.dismissed);
    }

    if (options?.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    if (options?.deviceId) {
      notifications = notifications.filter(n => n.deviceId === options.deviceId);
    }

    if (options?.channel) {
      notifications = notifications.filter(n => n.channel === options.channel);
    }

    if (options?.severity) {
      notifications = notifications.filter(n => n.severity === options.severity);
    }

    if (options?.tags && options.tags.length > 0) {
      notifications = notifications.filter(n => 
        n.tags && n.tags.some(tag => options.tags!.includes(tag))
      );
    }

    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  /**
   * Save history to localStorage
   */
  private saveHistory() {
    try {
      const historyToSave = this.history.slice(0, 100).map(n => ({
        ...n,
        // Don't save functions or complex objects
        actions: n.actions?.map(a => ({ ...a, onClick: undefined })),
      }));
      localStorage.setItem('notification_history', JSON.stringify(historyToSave));
    } catch (error) {
      this.log('error', 'Error saving notification history:', error);
      // Try to save with smaller size if quota exceeded
      try {
        const smallerHistory = this.history.slice(0, 50);
        localStorage.setItem('notification_history', JSON.stringify(smallerHistory));
      } catch (e) {
        this.log('error', 'Failed to save even smaller history:', e);
      }
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistory() {
    try {
      const saved = localStorage.getItem('notification_history');
      if (saved) {
        this.history = JSON.parse(saved);
        this.log('debug', `Loaded ${this.history.length} notifications from history`);
      }
    } catch (error) {
      this.log('error', 'Error loading notification history:', error);
      this.history = [];
    }
  }

  /**
   * Logging utility
   */
  private log(level: LogLevel, message: string, ...args: any[]) {
    const levels: Record<LogLevel, number> = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };

    const configLevel = levels[this.config.logLevel] || 2;
    const messageLevel = levels[level] || 2;

    if (messageLevel <= configLevel && level !== 'silent') {
      const prefix = `[NotificationManager:${level.toUpperCase()}]`;
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
      }
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
    }

    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];

    this.queue = [];
    this.history = [];
    this.throttleMap.clear();
    this.deduplicationMap.clear();
    this.groupingMap.clear();
    this.middlewares = [];

    this.log('info', 'NotificationManager destroyed');
    this.emit('destroyed');
  }

  /**
   * Get device display name
   */
  private getDeviceDisplayName(device: Device | { device_id?: string; name?: string; device_name?: string; client_id?: string }): string {
    if (!device) return 'Unknown Device';
    if ('name' in device && device.name) return device.name;
    if ('device_name' in device && device.device_name) return device.device_name;
    if ('device_id' in device && device.device_id) return device.device_id;
    if ('client_id' in device && device.client_id) return device.client_id;
    return 'Unknown Device';
  }

  // Convenience methods for common notification types
  async notifyAlarm(alarm: Alarm, device: Device) {
    const deviceName = this.getDeviceDisplayName(device);
    return this.notify({
      title: `Alarm Triggered: ${deviceName}`,
      message: `${deviceName}: ${alarm.variable_name} is ${alarm.condition} ${alarm.threshold}`,
      severity: alarm.severity === 'error' ? 'error' : alarm.severity === 'warning' ? 'warning' : 'info',
      priority: alarm.severity === 'error' ? 'critical' : 'high',
      type: 'alarm',
      channel: 'alarm',
      alarmId: alarm.alarm_id,
      deviceId: device.client_id,
      groupKey: `alarm_${alarm.alarm_id}`,
      tags: ['alarm', 'device', device.client_id],
      actions: [
        {
          label: 'View Device',
          action: 'view_device',
          variant: 'primary',
        },
        {
          label: 'Dismiss',
          action: 'dismiss',
        },
      ],
    });
  }

  async notifyDeviceStatusChange(device: Device, oldStatus: string, newStatus: string) {
    const isCritical = newStatus === 'Offline';
    return this.notify({
      title: 'Device Status Changed',
      message: `${device.name || device.client_id} changed from ${oldStatus} to ${newStatus}`,
      severity: isCritical ? 'error' : 'info',
      priority: isCritical ? 'high' : 'normal',
      type: 'device_status',
      channel: 'device',
      deviceId: device.client_id,
      groupKey: `status_${device.client_id}`,
      duration: isCritical ? 0 : 5000,
      tags: ['device', 'status', device.client_id],
    });
  }

  async notifySubscriptionTrigger(subscription: any, currentValue: any, device?: Device | { name?: string; device_name?: string }) {
    // Format message based on condition type
    let message = '';
    const conditionType = subscription.condition_type || 'change';
    const parameterName = subscription.parameter_name || 'parameter';
    const thresholdValue = subscription.threshold_value;

    // Get device name - prefer passed device object, fallback to subscription data
    let deviceName = 'Device';
    if (device) {
      deviceName = this.getDeviceDisplayName(device);
    } else if (subscription.device_id) {
      deviceName = subscription.device_id;
    }

    switch (conditionType) {
      case 'change':
        message = `${deviceName}: ${parameterName} changed to ${currentValue}`;
        break;
      case 'above':
        message = `${deviceName}: ${parameterName} (${currentValue}) is above threshold (${thresholdValue})`;
        break;
      case 'below':
        message = `${deviceName}: ${parameterName} (${currentValue}) is below threshold (${thresholdValue})`;
        break;
      case 'equals':
        message = `${deviceName}: ${parameterName} equals ${currentValue}`;
        break;
      case 'not_equals':
        message = `${deviceName}: ${parameterName} (${currentValue}) is not equal to ${thresholdValue}`;
        break;
      default:
        message = `${deviceName}: ${parameterName} value changed to ${currentValue}`;
    }

    // Determine severity based on parameter type
    const criticalParams = ['battery', 'signal_quality', 'status'];
    const severity = criticalParams.includes(parameterName) ? 'warning' : 'info';
    const priority = criticalParams.includes(parameterName) ? 'high' : 'normal';

    return this.notify({
      title: `Subscription Alert: ${deviceName}`,
      message: message,
      severity: severity as NotificationSeverity,
      priority: priority,
      type: 'subscription',
      channel: 'subscription',
      subscriptionId: subscription.subscription_id,
      deviceId: subscription.device_id,
      groupKey: `subscription_${subscription.subscription_id}`,
      tags: ['subscription', subscription.device_id, parameterName],
      actions: [
        {
          label: 'View Device',
          action: 'view_device',
          variant: 'primary',
        },
      ],
      data: {
        subscription: subscription,
        currentValue: currentValue,
        conditionType: conditionType,
      },
    });
  }

  async notifyCommandResult(device: Device, command: string, success: boolean) {
    return this.notify({
      title: `Command ${success ? 'Success' : 'Failed'}`,
      message: `${command} command ${success ? 'executed successfully' : 'failed'} on ${device.name || device.client_id}`,
      severity: success ? 'success' : 'error',
      priority: 'normal',
      type: 'command',
      channel: 'command',
      deviceId: device.client_id,
      duration: 3000,
      tags: ['command', device.client_id],
    });
  }
}

// Create singleton instance with default config
const notificationManager = new NotificationManager();

// Allow configuration on module load (for testing or custom configs)
if (typeof window !== 'undefined' && (window as any).__NOTIFICATION_CONFIG__) {
  notificationManager.updateConfig((window as any).__NOTIFICATION_CONFIG__);
}

export default notificationManager;
