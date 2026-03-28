const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (data: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
  }) => request<{ message: string; user_id: string }>('POST', '/signup', data),

  login: (data: { email: string; password: string }) =>
    request<{ message: string; user_id: string; access_token: string }>('POST', '/login', data),

  logout: () => request<{ message: string }>('POST', '/logout'),

  getChats: (userId: string) =>
    request<{
      user_id: string;
      chats: Array<{ chat_id: string; chat_name: string; created_at: string }>;
    }>('GET', `/chats?user_id=${userId}`),

  openChat: (chatId: string) =>
    request<{
      chat_id: string;
      members: Array<{
        user_id: string;
        username: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>;
      messages: Array<{
        message_id: string;
        content: string;
        created_at: string;
        user_id: string;
        chat_id: string;
      }>;
    }>('GET', `/open-chat?chat_id=${chatId}`),

  sendMessage: (data: { chat_id: string; user_id: string; content: string }) =>
    request<{
      message: string;
      data: { message_id: string; content: string; created_at: string; user_id: string; chat_id: string };
    }>('POST', '/messages', data),

  createHangout: (data: { chat_id: string; vibe?: string; event_time?: string }) =>
    request<{
      message: string;
      hangout: {
        hangout_id: string;
        chat_id: string;
        vibe: string | null;
        event_time: string | null;
        created_at: string;
      };
    }>('POST', '/create-hangout', data),

  getHangout: (chatId: string) =>
    request<{
      chat_id: string;
      hangout: {
        hangout_id: string;
        vibe: string | null;
        event_time: string | null;
        created_at: string;
        chat_id: string;
        location_id: string | null;
      } | null;
    }>('GET', `/hangout?chat_id=${chatId}`),

  savePreferences: (data: {
    user_id: string;
    chat_id: string;
    vibe?: string | null;
    suggestions?: string | null;
    available_times?: string[] | null;
    location?: { street_address?: string } | null;
  }) => request<{ message: string; preferences: unknown }>('POST', '/preferences', data),
};
