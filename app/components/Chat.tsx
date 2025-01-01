import { useEffect, useRef, useState } from 'react';
import { HumeClient, HumeStream } from '@hume.ai/client';
import { Message } from './Message';
import { Controls } from './Controls';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotions?: string;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connectWebSocket = async () => {
    const ws = new WebSocket('wss://api.hume.ai/v0/evi/chat/stream');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      // Send authentication
      ws.send(JSON.stringify({
        type: 'auth',
        api_key: process.env.NEXT_PUBLIC_HUME_API_KEY,
        secret_key: process.env.NEXT_PUBLIC_HUME_SECRET_KEY,
        config_id: process.env.NEXT_PUBLIC_HUME_CONFIG_ID
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      if (data.type === 'chat_metadata') {
        addMessage({
          role: 'system',
          content: `Chat started - ID: ${data.chat_id}`
        });
      } else if (data.type === 'user_message') {
        const emotions = data.from_text === false && data.models?.prosody?.scores
          ? Object.entries(data.models.prosody.scores)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([emotion, score]) => `${emotion}: ${score.toFixed(2)}`)
              .join(', ')
          : '';

        addMessage({
          role: 'user',
          content: data.message.content,
          emotions
        });

        // Check for patient info requests
        if (data.message.content.toLowerCase().includes('patient')) {
          const nameMatch = data.message.content.match(/patient\s+(\w+)\s+(\w+)/i);
          if (nameMatch) {
            const [_, firstName, lastName] = nameMatch;
            const patientInfo = await fetchPatientInfo(firstName, lastName);
            addMessage({
              role: 'system',
              content: JSON.stringify(patientInfo, null, 2)
            });
          }
        }
      } else if (data.type === 'assistant_message') {
        addMessage({
          role: 'assistant',
          content: data.message.content
        });
      } else if (data.type === 'error') {
        addMessage({
          role: 'system',
          content: `Error: ${data.message} (Code: ${data.code})`
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Attempt to reconnect after a delay
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage({
        role: 'system',
        content: `WebSocket error: ${error.toString()}`
      });
    };
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const fetchPatientInfo = async (firstName: string, lastName: string) => {
    try {
      const response = await fetch(`/api/db?firstName=${firstName}&lastName=${lastName}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching patient info:', error);
      return { error: 'Failed to fetch patient information' };
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const blob = new Blob([event.data], { type: 'audio/webm;codecs=opus' });
          const reader = new FileReader();
          reader.onload = () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data && wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'audio',
                data: base64data
              }));
            }
          };
          reader.readAsDataURL(blob);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      addMessage({
        role: 'system',
        content: 'Started recording...'
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      addMessage({
        role: 'system',
        content: `Error accessing microphone: ${error.toString()}`
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      addMessage({
        role: 'system',
        content: 'Stopped recording.'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <Message key={index} {...message} />
        ))}
      </div>
      <Controls
        isConnected={isConnected}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </div>
  );
} 