import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Users, MessageSquare, UserPlus, X, Loader, AlertCircle } from 'lucide-react';
import { ConnectionRequest, ActiveConnection, Message, ConnectedUser } from '../../types/connect';

const MESSAGES_PER_PAGE = 50;
const CONNECTION_TIMEOUT = 40000; // 40 seconds in milliseconds

export const ConnectPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionRequest, setConnectionRequest] = useState<ConnectionRequest | null>(null);
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);
  const [connectedUser, setConnectedUser] = useState<ConnectedUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (connectionId: string, lastMessageId?: string) => {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true })
        .limit(MESSAGES_PER_PAGE);

      if (lastMessageId) {
        query = query.lt('id', lastMessageId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const subscribeToMessages = (connectionId: string) => {
    const subscription = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToConnectionChanges = () => {
    if (!user) return;

    const subscription = supabase
      .channel(`connections:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_connections',
          filter: `or(user1_id=eq.${user.id},user2_id=eq.${user.id})`,
        },
        () => {
          fetchConnectionStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchConnectionStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check for existing connection request
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('user_id', user.id);

      if (requestError) throw requestError;

      // Set connection request if exists
      setConnectionRequest(requestData?.[0] || null);

      // Check for active connection
      const { data: connectionData, error: connectionError } = await supabase
        .from('active_connections')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (connectionError) throw connectionError;

      const activeConnection = connectionData?.[0];
      setActiveConnection(activeConnection || null);

      if (activeConnection) {
        // Clear any existing timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
          setSearchTimeout(null);
        }
        setShowTimeoutMessage(false);

        // Fetch connected user's profile
        const connectedUserId = activeConnection.user1_id === user.id 
          ? activeConnection.user2_id 
          : activeConnection.user1_id;

        const { data: connectedUserData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', connectedUserId)
          .single();

        if (userError) throw userError;
        setConnectedUser(connectedUserData);

        // Fetch initial messages
        const messagesData = await fetchMessages(activeConnection.id);
        setMessages(messagesData);

        // Subscribe to new messages
        const unsubscribe = subscribeToMessages(activeConnection.id);
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };

      } else {
        setConnectedUser(null);
        setMessages([]);

        // If there's a searching request but no active connection,
        // start the timeout counter
        if (requestData?.[0]?.status === 'searching') {
          // Clear any existing timeout
          if (searchTimeout) {
            clearTimeout(searchTimeout);
          }

          // Set new timeout
          const timeout = setTimeout(() => {
            setShowTimeoutMessage(true);
            handleCancelRequest();
          }, CONNECTION_TIMEOUT);

          setSearchTimeout(timeout);
        }
      }

    } catch (error: any) {
      console.error('Error fetching connection status:', error);
      setError('Failed to load connection status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnectionStatus();
      const unsubscribe = subscribeToConnectionChanges();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };

    }
  }, [user]);

  const handleLoadMoreMessages = async () => {
    if (!activeConnection || messages.length === 0) return;

    try {
      setLoadingMore(true);
      const oldestMessageId = messages[0].id;
      const olderMessages = await fetchMessages(activeConnection.id, oldestMessageId);
      
      if (olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setShowTimeoutMessage(false);

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          user_id: user.id,
          nickname,
          location,
          interests,
          status: 'searching'
        });

      if (error) throw error;

      const { data: newRequest } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setConnectionRequest(newRequest);

      // Start timeout counter
      const timeout = setTimeout(() => {
        setShowTimeoutMessage(true);
        handleCancelRequest();
      }, CONNECTION_TIMEOUT);

      setSearchTimeout(timeout);

    } catch (error: any) {
      console.error('Error creating connection request:', error);
      setError('Failed to create connection request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!connectionRequest) return;

    try {
      setLoading(true);
      setError(null);

      // Clear any existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }

      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', connectionRequest.id);

      if (error) throw error;

      setConnectionRequest(null);
      setShowTimeoutMessage(false);
    } catch (error: any) {
      console.error('Error canceling request:', error);
      setError('Failed to cancel request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndConnection = async () => {
    if (!activeConnection) return;

    try {
      setLoading(true);
      setError(null);

      const { error: connectionError } = await supabase
        .from('active_connections')
        .delete()
        .eq('id', activeConnection.id);

      if (connectionError) throw connectionError;

      const { error: requestError } = await supabase
        .from('connection_requests')
        .update({ status: 'searching' })
        .eq('user_id', user?.id);

      if (requestError) throw requestError;

      setActiveConnection(null);
      setConnectedUser(null);
      setMessages([]);
    } catch (error: any) {
      console.error('Error ending connection:', error);
      setError('Failed to end connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeConnection) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          connection_id: activeConnection.id,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please sign in to access the connection feature.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Connect with Others</h2>
              <Users className="h-6 w-6 text-gray-400" />
            </div>

            {error && (
              <div className="mb-6 bg-red-50 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <Loader className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="mt-2 text-sm text-gray-500">Loading...</p>
              </div>
            ) : activeConnection && connectedUser ? (
              <div>
                <div className="flex items-center justify-between mb-6 p-4 bg-indigo-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Connected with {connectedUser.nickname || connectedUser.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        From {connectedUser.location}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEndConnection}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    <X className="h-4 w-4 mr-1" />
                    End Connection
                  </button>
                </div>

                <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto">
                  {messages.length > MESSAGES_PER_PAGE && (
                    <button
                      onClick={handleLoadMoreMessages}
                      disabled={loadingMore}
                      className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500 mb-4"
                    >
                      {loadingMore ? 'Loading...' : 'Load More Messages'}
                    </button>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${
                        message.sender_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-xs ${
                          message.sender_id === user.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Send
                  </button>
                </form>
              </div>
            ) : connectionRequest ? (
              <div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-yellow-900">
                        Searching for Connection
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        Waiting to be matched with another learner...
                      </p>
                    </div>
                    <button
                      onClick={handleCancelRequest}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-yellow-700">
                      Your preferences:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {connectionRequest.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  {showTimeoutMessage && (
                    <div className="mt-4 p-4 bg-orange-50 rounded-md">
                      <p className="text-sm text-orange-800">
                        No connections found after 40 seconds. Your request will be cancelled automatically. 
                        You can try again with different interests or at a different time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div>
                  <label
                    htmlFor="nickname"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nickname
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Location
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Interests
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.interests?.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() =>
                          interests.includes(interest)
                            ? setInterests(interests.filter((i) => i !== interest))
                            : setInterests([...interests, interest])
                        }
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          interests.includes(interest)
                            ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={!nickname || !location || interests.length === 0}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Start Connecting
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
