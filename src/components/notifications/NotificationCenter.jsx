import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/entities';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscriptions for messages and insight notifications
    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'direction=eq.inbound' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    const insightsChannel = supabase
      .channel('insight_notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insight_notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(insightsChannel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent inbound messages with dealer info
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          dealers (name)
        `)
        .eq('created_by', user.id)
        .eq('direction', 'inbound')
        .eq('is_read', false)
        .order('created_date', { ascending: false })
        .limit(10);

      if (messagesError) throw messagesError;

      // Get unread insight notifications
      const { data: insightNotifs, error: insightsError } = await supabase
        .from('insight_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (insightsError) throw insightsError;

      const formattedMessages = messages?.map(message => ({
        id: `msg-${message.id}`,
        type: 'message',
        originalId: message.id,
        title: `New message from ${message.dealers?.name || 'Unknown Dealer'}`,
        message: message.content.length > 100
          ? message.content.substring(0, 100) + '...'
          : message.content,
        time: new Date(message.created_date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: new Date(message.created_date),
        dealId: message.deal_id,
        dealerId: message.dealer_id,
        notificationType: 'message'
      })) || [];

      const formattedInsights = insightNotifs?.map(notif => ({
        id: `insight-${notif.id}`,
        type: 'insight',
        originalId: notif.id,
        title: notif.title,
        message: notif.message,
        time: new Date(notif.sent_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: new Date(notif.sent_at),
        notificationType: notif.notification_type,
      })) || [];

      // Combine and sort by timestamp
      const allNotifications = [...formattedMessages, ...formattedInsights]
        .sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.type === 'insight') {
      return '/dashboard';
    }
    if (notification.dealId) {
      return `/deal-details?deal_id=${notification.dealId}`;
    } else if (notification.dealerId) {
      return `/messages?dealer_id=${notification.dealerId}`;
    }
    return '/messages';
  };

  const getNotificationIcon = (notification) => {
    if (notification.type === 'insight') {
      if (notification.notificationType === 'critical') {
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      } else if (notification.notificationType === 'important') {
        return <Lightbulb className="w-4 h-4 text-orange-600" />;
      }
      return <Info className="w-4 h-4 text-blue-600" />;
    }
    return <MessageSquare className="w-4 h-4 text-brand-teal" />;
  };

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);

    try {
      if (notification.type === 'insight') {
        await supabase
          .from('insight_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notification.originalId);
      } else {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', notification.originalId);
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    // Navigate to appropriate page
    setTimeout(() => {
      const link = getNotificationLink(notification);
      window.location.href = link;
    }, 50);
  };
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-lime text-brand-teal text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="block p-4 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 group cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 group-hover:text-brand-teal">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200">
              <div
                onClick={() => {
                  setIsOpen(false);
                  setTimeout(() => window.location.href = '/messages', 50);
                }}
                className="text-sm text-brand-teal hover:text-brand-teal-dark font-medium"
              >
                View all messages →
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}