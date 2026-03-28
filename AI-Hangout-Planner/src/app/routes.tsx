import { createBrowserRouter } from "react-router";
import { Registration } from "./pages/Registration";
import { Login } from "./pages/Login";
import { ChatHub } from "./pages/ChatHub";
import { GroupChat } from "./pages/GroupChat";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Registration />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/chat-hub",
    element: <ChatHub />,
  },
  {
    path: "/group/:groupId",
    element: <GroupChat />,
  },
]);
