"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Users, MessageSquare, Search, MoreVertical, Phone, Video } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  chat_room_id: string
  created_at: string
  message_type: "text" | "file" | "system"
}

interface ChatRoom {
  id: string
  name: string
  type: "direct" | "group" | "department"
  participants: string[]
  last_message?: string
  last_message_at?: string
  unread_count: number
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  department?: string
  is_online: boolean
  last_seen?: string
}

export function InternalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    initializeChat()
    setupRealtimeSubscriptions()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom)
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profile) {
        setCurrentUser({
          id: profile.id,
          full_name: profile.full_name || `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: profile.role,
          department: profile.department,
          is_online: true,
        })
      }

      // Fetch chat rooms and users
      await Promise.all([fetchChatRooms(), fetchUsers()])
    } catch (error) {
      console.error("Error initializing chat:", error)
      toast.error("Failed to initialize chat")
    }
  }

  const fetchChatRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select(`
          *,
          chat_messages(content, created_at)
        `)
        .order("updated_at", { ascending: false })

      if (error) throw error

      const roomsWithUnread =
        data?.map((room) => ({
          ...room,
          unread_count: 0, // In a real app, calculate based on last_read_at
          last_message: room.chat_messages?.[0]?.content || "",
          last_message_at: room.chat_messages?.[0]?.created_at,
        })) || []

      setChatRooms(roomsWithUnread)
    } catch (error) {
      console.error("Error fetching chat rooms:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, department")
        .eq("status", "active")

      if (error) throw error

      const usersWithStatus =
        data?.map((user) => ({
          id: user.id,
          full_name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          department: user.department,
          is_online: Math.random() > 0.3, // Simulate online status
        })) || []

      setUsers(usersWithStatus)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey(first_name, last_name)
        `)
        .eq("chat_room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50)

      if (error) throw error

      const formattedMessages =
        data?.map((msg) => ({
          ...msg,
          sender_name: `${msg.profiles?.first_name} ${msg.profiles?.last_name}`,
        })) || []

      setMessages(formattedMessages)
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !currentUser) return

    try {
      const { error } = await supabase.from("chat_messages").insert({
        content: newMessage.trim(),
        sender_id: currentUser.id,
        chat_room_id: selectedRoom,
        message_type: "text",
      })

      if (error) throw error

      setNewMessage("")

      // Update room's last message
      await supabase
        .from("chat_rooms")
        .update({
          updated_at: new Date().toISOString(),
          last_message: newMessage.trim(),
        })
        .eq("id", selectedRoom)
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    }
  }

  const createDirectMessage = async (userId: string) => {
    if (!currentUser) return

    try {
      // Check if DM already exists
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("type", "direct")
        .contains("participants", [currentUser.id, userId])
        .single()

      if (existingRoom) {
        setSelectedRoom(existingRoom.id)
        return
      }

      // Create new DM room
      const { data: newRoom, error } = await supabase
        .from("chat_rooms")
        .insert({
          name: `DM-${currentUser.id}-${userId}`,
          type: "direct",
          participants: [currentUser.id, userId],
        })
        .select()
        .single()

      if (error) throw error

      setSelectedRoom(newRoom.id)
      fetchChatRooms()
    } catch (error) {
      console.error("Error creating direct message:", error)
      toast.error("Failed to create direct message")
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel("chat_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        if (payload.new.chat_room_id === selectedRoom) {
          fetchMessages(selectedRoom)
        }
        fetchChatRooms() // Update room list
      })
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedRoomData = chatRooms.find((room) => room.id === selectedRoom)

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background rounded-lg border">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                      selectedRoom === room.id ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback>
                        {room.type === "direct" ? <MessageSquare className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{room.name}</p>
                        {room.unread_count > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                          >
                            {room.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{room.last_message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="people" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => createDirectMessage(user.id)}
                    className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      {user.is_online && (
                        <div className="absolute bottom-0 right-2 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback>
                    {selectedRoomData?.type === "direct" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedRoomData?.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoomData?.type === "direct" ? "Direct Message" : "Group Chat"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUser?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex items-start max-w-xs lg:max-w-md ${
                        message.sender_id === currentUser?.id ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar className="h-8 w-8 mx-2">
                        <AvatarFallback>{getInitials(message.sender_name)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          message.sender_id === currentUser?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender_id === currentUser?.id
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
