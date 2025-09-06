-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'department')),
    participants UUID[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_participants table for better participant management
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    UNIQUE(chat_room_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants ON chat_rooms USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_rooms
CREATE POLICY "Users can view chat rooms they participate in" ON chat_rooms
    FOR SELECT USING (
        auth.uid() = ANY(participants) OR
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_participants.chat_room_id = chat_rooms.id 
            AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update chat rooms" ON chat_rooms
    FOR UPDATE USING (
        auth.uid() = ANY(participants) OR
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_participants.chat_room_id = chat_rooms.id 
            AND chat_participants.user_id = auth.uid()
        )
    );

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view messages in their chat rooms" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.chat_room_id 
            AND (
                auth.uid() = ANY(chat_rooms.participants) OR
                EXISTS (
                    SELECT 1 FROM chat_participants 
                    WHERE chat_participants.chat_room_id = chat_rooms.id 
                    AND chat_participants.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can send messages to their chat rooms" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.chat_room_id 
            AND (
                auth.uid() = ANY(chat_rooms.participants) OR
                EXISTS (
                    SELECT 1 FROM chat_participants 
                    WHERE chat_participants.chat_room_id = chat_rooms.id 
                    AND chat_participants.user_id = auth.uid()
                )
            )
        )
    );

-- Create RLS policies for chat_participants
CREATE POLICY "Users can view participants in their chat rooms" ON chat_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM chat_participants cp2 
            WHERE cp2.chat_room_id = chat_participants.chat_room_id 
            AND cp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join chat rooms" ON chat_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON chat_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Create function to update chat room timestamp when message is sent
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_rooms 
    SET updated_at = NEW.created_at,
        last_message = NEW.content
    WHERE id = NEW.chat_room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating chat room timestamp
CREATE TRIGGER update_chat_room_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_room_timestamp();

-- Insert some default chat rooms
INSERT INTO chat_rooms (name, type, participants, created_by) VALUES
('General Discussion', 'group', '{}', NULL),
('Sales Team', 'department', '{}', NULL),
('Management', 'group', '{}', NULL)
ON CONFLICT DO NOTHING;
