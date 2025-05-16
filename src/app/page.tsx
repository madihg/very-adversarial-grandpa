'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Volume2, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id: string;
  isFloating?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content:
        'You are an adversarial grandfather, responding with condescension, skepticism, and mild disappointment at the new generation.',
      id: 'system-prompt',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      formData.append('file', file);

      const response = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      setInput(data.text);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      alert(error.message || 'Failed to transcribe audio');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      console.log('Sending text to speech API:', text);

      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from speech API:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate speech: ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type');
      console.log('Response content type:', contentType);

      if (!contentType || !contentType.includes('audio/mpeg')) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Invalid response format:', errorData);
        throw new Error(errorData.error || 'Response was not audio format');
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        console.error('Empty audio blob received');
        throw new Error('Empty audio received from API');
      }

      console.log('Audio blob received, size:', audioBlob.size);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
      };

      audio.play();
    } catch (error: any) {
      console.error('Error generating speech:', error);
      alert(error.message || 'Failed to generate speech');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      id: `user-${Date.now()}`,
      isFloating: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessage = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: Date.now(),
          id: `assistant-${Date.now()}`,
        },
      ]);
    } catch (error) {
      console.error('Error getting completion:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
          id: `error-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" style={{
      backgroundImage: "url('https://media.istockphoto.com/id/1169495140/photo/the-surface-of-the-lava-background.jpg?s=612x612&w=0&k=20&c=SmmEexArJ-2BKmPgDxC5wCA5AWzkNQwzJg2sulwHFss=')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundBlendMode: "overlay"
    }}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-black bg-opacity-80 rounded-lg border-2 border-red-600 shadow-2xl overflow-hidden" style={{
          boxShadow: "0 0 20px #ff3300, 0 0 40px rgba(255, 0, 0, 0.4)"
        }}>
          <div className="h-[700px] flex flex-col">
            <div className="p-4 bg-gradient-to-r from-red-900 to-orange-800 border-b-2 border-red-600">
              <h1 className="text-2xl font-bold text-red-300 uppercase tracking-widest" style={{
                fontFamily: "'Cinzel', serif",
                textShadow: "0 0 10px #ff6600, 0 0 5px #ff3300"
              }}>TARTARUS CHAT</h1>
              <p className="text-sm text-amber-300 italic">Speak with Grampy, the tormentor of souls</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{
              backgroundImage: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.5)), url('https://media.istockphoto.com/id/1169495140/photo/the-surface-of-the-lava-background.jpg?s=612x612&w=0&k=20&c=SmmEexArJ-2BKmPgDxC5wCA5AWzkNQwzJg2sulwHFss=')",
              backgroundSize: "cover",
              backgroundAttachment: "fixed"
            }}>
              {messages.slice(1).map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center border border-red-600" style={{
                      boxShadow: "0 0 10px #ff3300"
                    }}>
                      <Bot size={20} className="text-orange-300" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col max-w-[70%] ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-900 text-blue-100 border border-blue-400' + (message.isFloating ? ' animate-pulse' : '')
                          : 'bg-gradient-to-r from-red-900 to-red-800 text-orange-100 border border-red-500'
                      }`}
                      style={{
                        boxShadow: message.role === 'user' ? "0 0 10px rgba(59, 130, 246, 0.5)" : "0 0 15px rgba(255, 0, 0, 0.3)",
                      }}
                    >
                      <p className="whitespace-pre-wrap" style={{
                        fontFamily: message.role === 'assistant' ? "'Crimson Text', serif" : "'Quicksand', sans-serif"
                      }}>{message.content}</p>
                    </div>

                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speakText(message.content)}
                        className="mt-2 text-amber-500 hover:text-amber-300 transition-colors"
                        aria-label="Text to speech"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}

                    {message.timestamp && (
                      <span className="text-xs text-gray-400 mt-1 italic">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center border border-blue-400" style={{
                      boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)"
                    }}>
                      <User size={20} className="text-blue-300" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center border border-red-600" style={{
                    boxShadow: "0 0 10px #ff3300"
                  }}>
                    <Bot size={20} className="text-orange-300" />
                  </div>
                  <div className="bg-gradient-to-r from-red-900 to-red-800 border border-red-500 rounded-lg p-4" style={{
                    boxShadow: "0 0 15px rgba(255, 0, 0, 0.3)"
                  }}>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-gradient-to-r from-black to-red-950 border-t-2 border-red-600">
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Speak your sins..."
                  className="flex-1 p-3 border-2 border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-black text-amber-200 placeholder-red-300"
                  style={{
                    boxShadow: "inset 0 0 10px rgba(255, 0, 0, 0.3)"
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-400'
                      : 'bg-gray-900 hover:bg-gray-800 text-red-400 border-2 border-red-600'
                  }`}
                  style={{
                    boxShadow: isRecording ? "0 0 15px rgba(255, 0, 0, 0.5)" : "0 0 10px rgba(255, 0, 0, 0.3)"
                  }}
                  disabled={isLoading}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>
                <button
                  type="submit"
                  className="p-3 bg-gradient-to-r from-red-800 to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-400"
                  style={{
                    boxShadow: "0 0 15px rgba(255, 0, 0, 0.3)"
                  }}
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
