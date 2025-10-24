import { useEffect, useState, useRef, useCallback } from 'react';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Message {
  _id: string;
  sender: User;
  content: string;
  createdAt: string;
  isAdminMessage: boolean;
  messageType?: string;
}

// Custom EventSource with token support
const createEventSource = (url: string, token: string) => {
  const urlWithToken = new URL(url);
  urlWithToken.searchParams.set('token', token);
  return new EventSource(urlWithToken.toString());
};

export const useConversationStream = (conversationId: string | null, token: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!conversationId || !token) {
      console.log('Missing conversationId or token');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";
    
    try {
      console.log(`Connecting to conversation stream: ${conversationId}`);
      
      const eventSource = createEventSource(
        `${API_URL}/api/conversations/${conversationId}/stream`,
        token
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ Real-time connection opened');
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          // Ignore heartbeat messages
          if (event.data === ': heartbeat' || event.data === ': ping') {
            return;
          }

          const data = JSON.parse(event.data);
          
          // Handle connection confirmation
          if (data.type === 'connected') {
            console.log('Successfully connected to conversation stream');
            return;
          }

          // Handle single new message
          if (data._id && data.content && data.sender) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(msg => msg._id === data._id)) {
                return prev;
              }
              return [...prev, data];
            });
          }

        } catch (error) {
          console.error('Error parsing SSE message:', error, event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        setError('Connection error');
        
        // Attempt reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };

    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError('Failed to establish connection');
    }
  }, [conversationId, token]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from conversation stream');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (conversationId && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, conversationId, token]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(msg => msg._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { 
    messages, 
    setMessages, 
    addMessage, 
    clearMessages,
    isConnected, 
    error
  };
};