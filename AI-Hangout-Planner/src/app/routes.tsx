import { createBrowserRouter } from "react-router";
import { Registration } from "./pages/Registration";
import { ChatHub } from "./pages/ChatHub";
import { GroupChat } from "./pages/GroupChat";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Registration />,
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
