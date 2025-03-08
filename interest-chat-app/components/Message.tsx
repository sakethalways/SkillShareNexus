interface MessageProps {
  message: {
    text: string;
  };
  isSentByUser: boolean;
}

export default function Message({ message, isSentByUser }: MessageProps) {
  return (
    <div className={`message ${isSentByUser ? "sent" : "received"}`}>
      <p>{message.text}</p>
    </div>
  );
}
