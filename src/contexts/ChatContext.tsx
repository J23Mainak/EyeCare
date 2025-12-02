import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useAuth } from "./AuthContext";

interface ChatContextType {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  draftMessage: string;
  setDraftMessage: (message: string) => void;
  resetChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string>("");
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Reset chat whenever user changes (login/logout/switch)
  useEffect(() => {
    const currentUserId = user?._id || null;

    // If user changed, reset everything
    if (currentUserId !== lastUserId) {
      console.log("User changed - resetting chat", {
        lastUserId,
        currentUserId,
      });
      setCurrentChatId(null);
      setDraftMessage("");
      setLastUserId(currentUserId);
    }
  }, [user?._id, lastUserId]);

  const resetChat = () => {
    setCurrentChatId(null);
    setDraftMessage("");
  };

  return (
    <ChatContext.Provider
      value={{
        currentChatId,
        setCurrentChatId,
        draftMessage,
        setDraftMessage,
        resetChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}