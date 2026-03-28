import { createBrowserRouter } from 'react-router';
import { Registration } from './pages/Registration';
import { Layout } from './pages/Layout';
import { GroupChat } from './pages/GroupChat';
import { EmptyChat } from './pages/EmptyChat';
import { RequireAuth } from './components/RequireAuth';

export const router = createBrowserRouter([
  { path: '/login', element: <Registration /> },
  {
    path: '/',
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <EmptyChat /> },
      { path: 'group/:groupId', element: <GroupChat /> },
    ],
  },
]);
